// src/screens/ChatScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  SectionList,
  TextInput,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import moment from 'moment';
import { db, auth, rtdb } from '../../firebase';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  addDoc,
  setDoc,
  serverTimestamp,
  query,
} from 'firebase/firestore';
import {
  ref as rtdbRef,
  set as rtdbSet,
  onValue as rtdbOnValue,
  onDisconnect as rtdbOnDisconnect,
} from 'firebase/database';
import { Send, ArrowLeft, MoreVertical, Paperclip, Smile } from 'lucide-react-native';

type Props = {
  route: any;
  navigation: any;
};

const ChatScreen: React.FC<Props> = ({ route, navigation }) => {
  const { chatId, otherUser } = route.params;
  const [sections, setSections] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [otherStatus, setOtherStatus] = useState<{ online?: boolean; typing?: boolean }>({});
  const sectionRef = useRef<SectionList<any> | null>(null);
  const typingTimeout = useRef<number | null>(null);
  const meUid = auth.currentUser?.uid;

  /* ---------------- Messages listener (grouped by day) ---------------- */
  useEffect(() => {
    if (!chatId) {return;}
    const msgsRef = collection(doc(collection(db, 'chats'), chatId), 'messages');
    const q = query(msgsRef, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(
      q,
      snap => {
        const msgs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        // group messages by day for SectionList
        const grouped: { [key: string]: any[] } = {};
        msgs.forEach(m => {
          const date = m.createdAt?.toDate ? m.createdAt.toDate() : new Date();
          const dayKey = moment(date).format('YYYY-MM-DD');
          if (!grouped[dayKey]) grouped[dayKey] = [];
          grouped[dayKey].push(m);
        });
        const sections = Object.keys(grouped)
          .sort((a, b) => (a > b ? 1 : -1))
          .map(day => ({
            title: moment(day).calendar(null, {
              sameDay: '[Today]',
              lastDay: '[Yesterday]',
              lastWeek: 'dddd',
              sameElse: 'MMM D, YYYY',
            }),
            data: grouped[day],
          }));
        setSections(sections);
        if (sections.length > 0) {
          const lastSection = sections[sections.length - 1];
          if (lastSection.data.length > 0) {
            setTimeout(() => {
              sectionRef.current?.scrollToLocation({
                sectionIndex: sections.length - 1,
                itemIndex: lastSection.data.length - 1,
                animated: true,
              });
            }, 120);
          }
        }
      },
      err => console.warn('messages listen err', err),
    );
    return () => unsub();
  }, [chatId]);

  /* ---------------- Presence setup (me) (unchanged) ---------------- */
  useEffect(() => {
    if (!meUid) {return;}
    const statusRef = rtdbRef(rtdb, `/status/${meUid}`);
    rtdbSet(statusRef, { state: 'online', lastChanged: Date.now() }).catch(() => {});
    try {
      const od = rtdbOnDisconnect(statusRef);
      od.set({ state: 'offline', lastChanged: Date.now() }).catch(() => {});
    } catch {}
    setDoc(doc(db, 'users', meUid), { online: true }, { merge: true }).catch(() => {});

    return () => {
      rtdbSet(statusRef, { state: 'offline', lastChanged: Date.now() }).catch(() => {});
      setDoc(doc(db, 'users', meUid), { online: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
    };
  }, [meUid]);

  /* ---------------- RTDB: listen to other user's status (online) ---------------- */
  useEffect(() => {
    if (!otherUser?.id) {return;}
    const statusRef = rtdbRef(rtdb, `/status/${otherUser.id}`);
    const off = rtdbOnValue(
      statusRef,
      snap => {
        const val = snap.exists() ? snap.val() : null;
        setOtherStatus(prev => ({ ...prev, online: val?.state === 'online' }));
      },
      err => {
        // ignore noisy errors but log
        console.warn('rtdb status listen failed', err);
      },
    );
    return () => off && off();
  }, [otherUser?.id]);

  /* ---------------- RTDB: listen to other user's typing flag ----------------
     Path: /typing/{chatId}/{otherUid} -> boolean
  ------------------------------------------------------------------------- */
  useEffect(() => {
    if (!chatId || !otherUser?.id) {return;}

    const typingRef = rtdbRef(rtdb, `/typing/${chatId}/${otherUser.id}`);

    const offTyping = rtdbOnValue(
      typingRef,
      snap => {
        const val = snap.exists() ? snap.val() : null;
        setOtherStatus(prev => ({ ...prev, typing: !!val }));
      },
      err => {
        console.warn('rtdb typing listen failed', err);
      },
    );

    return () => offTyping && offTyping();
  }, [chatId, otherUser?.id]);

  /* ---------------- Typing (write to RTDB) ----------------
     Write to /typing/{chatId}/{meUid} = true while typing, and remove (null) when stopped.
     Clear on send and on unmount.
  ------------------------------------------------------------------ */
  const setTypingFlag = async (isTyping: boolean) => {
    if (!meUid || !chatId) {return;}
    const myTypingRef = rtdbRef(rtdb, `/typing/${chatId}/${meUid}`);
    try {
      if (isTyping) {
        await rtdbSet(myTypingRef, true);
      } else {
        // remove node
        await rtdbSet(myTypingRef, null);
      }
    } catch (e) {
      console.warn('setTypingFlag failed', e);
    }
  };

const onChangeText = (val: string) => {
  setText(val);
  if (!meUid || !chatId) {return;}

  const myTypingRef = rtdbRef(rtdb, `/typing/${chatId}/${meUid}`);
  if (val.trim().length > 0) {
    rtdbSet(myTypingRef, true);
  } else {
    rtdbSet(myTypingRef, null);
  }
};


  /* clear typing flag if component unmounts */
  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
        typingTimeout.current = null;
      }
      // clear our typing flag
      setTypingFlag(false).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Send message (unchanged) ---------------- */
  const send = async () => {
    if (!text.trim() || !meUid) {return;}
    const msg = { text: text.trim(), from: meUid, to: otherUser.id, createdAt: serverTimestamp() };
    try {
      await addDoc(collection(doc(collection(db, 'chats'), chatId), 'messages'), msg);
      await setDoc(
        doc(collection(db, 'chats'), chatId),
        { participants: [meUid, otherUser.id], lastMessage: msg.text, lastUpdated: serverTimestamp() },
        { merge: true },
      );
      // clear input + typing flag
      setText('');
      await setTypingFlag(false);
    } catch (e) {
      console.warn('send failed', e);
    }
  };

  const isMyMessage = (m: any) => m.from === meUid;

  const renderPresence = () => {
    if (otherStatus.typing) {
      return <Text className="text-sm text-gray-600">typing...</Text>;
    }
    const dotColor = otherStatus.online ? 'bg-emerald-500' : 'bg-amber-400';
    const label = otherStatus.online ? 'Online' : 'Offline';
    return (
      <View className="flex-row items-center">
        <View className={`${dotColor} w-2 h-2 rounded-full mr-2`} />
        <Text className="text-sm text-gray-600">{label}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-2">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900">{otherUser.displayName}</Text>

        </View>
          {renderPresence()}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <SectionList
          ref={sectionRef}
          sections={sections}
          keyExtractor={(item) => item.id}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 16 }}
          renderSectionHeader={({ section: { title } }) => (
            <Text className="text-center text-sm text-gray-500 py-2">{title}</Text>
          )}
          renderItem={({ item }) => (
            <View className={`mb-4 ${isMyMessage(item) ? 'items-end' : 'items-start'}`}>
              <View
                className={`max-w-[75%] px-4 py-3 ${
                  isMyMessage(item)
                    ? 'bg-blue-600 rounded-tl-[18px] rounded-tr-[18px] rounded-bl-[18px]'
                    : 'bg-gray-100 rounded-tr-[18px] rounded-br-[18px] rounded-tl-[18px]'
                }`}
              >
                <Text className={`${isMyMessage(item) ? 'text-white' : 'text-gray-900'} text-base`}>{item.text}</Text>
              </View>
              <Text className={`text-xs mt-1 ${isMyMessage(item) ? 'text-blue-100' : 'text-gray-400'}`}>
                {item.createdAt?.toDate
                  ? moment(item.createdAt.toDate()).format('h:mm A')
                  : ''}
              </Text>
            </View>
          )}
        />

        {/* Composer */}
        <View className="bg-white border-t border-gray-200 px-4 py-3">
          <View className="flex-row items-center space-x-3">
            {/* <TouchableOpacity className="p-2">
              <Paperclip className="w-5 h-5 text-gray-500" />
            </TouchableOpacity> */}
            <View className="flex-1 bg-gray-100 rounded-full px-4 py-2 flex-row items-center">
              <TextInput
                value={text}
                onChangeText={onChangeText}
                placeholder="Type a message..."
                multiline
                className="flex-1 text-gray-900 text-base max-h-28"
                placeholderTextColor="#9CA3AF"
              />
              {/* <TouchableOpacity className="ml-2 p-2">
                <Smile className="w-5 h-5 text-gray-500" />
              </TouchableOpacity> */}
                 <TouchableOpacity
              onPress={send}
              disabled={!text.trim()}
              className={"ml-2 w-10 h-10 rounded-full items-center justify-center "}
            >
              <Send size={24} color={text?.trim() ? '#2563eb' :'black'}/>
            </TouchableOpacity>
            </View>
         
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;
