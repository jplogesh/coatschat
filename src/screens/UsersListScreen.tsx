import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  collection,
  query as firebaseQuery,
  orderBy,
  limit,
  startAt,
  endAt,
  onSnapshot,
  doc,
} from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { chatId as makeChatId } from '../utils/chatId';
import moment from 'moment';
import { LucideSearch, MessageCircle } from 'lucide-react-native';


const HeaderWithSearchInline = ({ query, setQuery }: { query: string; setQuery: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <View className="bg-white border-b border-slate-200 px-4 py-3">
      <View className="flex-row items-center justify-between">
        {open ? (
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search users..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 h-10 bg-slate-100 rounded-lg px-3 text-slate-900"
          />
        ) : (
          <View className='flex-row items-center gap-2'>
   <MessageCircle size={20} className="text-blue-600 mr-2" />
          <Text className=" text-lg font-semibold text-black">CoatsChat</Text>
     </View>  
        )}
        <TouchableOpacity onPress={() => (open ? (setQuery(''), setOpen(false)) : setOpen(true))} className="p-2 ml-2">
        {open ? <Text className="text-slate-700">X</Text> : <LucideSearch size={18} />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const UsersListScreen: React.FC<any> = ({ navigation }) => {
  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const currentUid = auth.currentUser?.uid;

  useEffect(() => {
    let unsubUsers: (() => void) | null = null;
    const chatUnsubs: Record<string, () => void> = {};

    const trimmedLower = queryText.trim().toLowerCase();
    setLoading(true);

    const q = trimmedLower
      ? firebaseQuery(
          collection(db, 'users'),
          orderBy('displayNameLower'),
          startAt(trimmedLower),
          endAt(trimmedLower + '\uf8ff'),
          limit(50),
        )
      : firebaseQuery(collection(db, 'users'), orderBy('displayNameLower'), limit(50));

    unsubUsers = onSnapshot(
      q,
      userSnap => {
        const users = userSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })).filter(u => u.id !== currentUid);
        setResults(users);

        // attach a listener for each chat doc
        users.forEach(u => {
          const cId = makeChatId(currentUid, u.id);
          if (chatUnsubs[cId]) return;
          chatUnsubs[cId] = onSnapshot(doc(db, 'chats', cId), chatSnap => {
            const chatData = chatSnap.data();
            setResults(prev =>
              prev.map(p =>
                p.id === u.id
                  ? {
                      ...p,
                      lastMessage: chatData?.lastMessage || '',
                      lastMessageStatus: chatData?.lastMessageStatus || 'sent',
                      lastMessageFrom: chatData?.lastMessageFrom || null,
                      unreadCount: chatData?.[`unread_${currentUid}`] || 0,
                    }
                  : p,
              ),
            );
          });
        });
        setLoading(false);
      },
      err => {
        console.warn('users snapshot err', err);
        setLoading(false);
      },
    );

    return () => {
      unsubUsers?.();
      Object.values(chatUnsubs).forEach(un => un && un());
    };
  }, [queryText, currentUid]);

  const openChatWith = (user: any) => {
    const id = makeChatId(currentUid, user.id);
    navigation.navigate('Chat', { chatId: id, otherUser: user });
  };

  const statusIcon = (status: string, lastMessageFrom: string) => {
    if (lastMessageFrom !== currentUid) return null;
    if (status === 'read') return <Text className="text-xs text-blue-500 ml-2">✓✓</Text>;
    if (status === 'delivered') return <Text className="text-xs text-gray-400 ml-2">✓✓</Text>;
    return <Text className="text-xs text-gray-400 ml-2">✓</Text>;
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="flex-row items-center bg-white mx-3 my-2 rounded-xl p-4 border border-slate-200"
      activeOpacity={0.8}
      onPress={() => openChatWith(item)}
    >
      <View className="w-12 h-12 rounded-full bg-slate-200 items-center justify-center mr-3 relative">
       
       {item?.photoURL  ? (
                     <Image
                       source={{ uri:item?.photoURL }}
                       className="w-28 h-28 rounded-full"
                       style={{ borderWidth: 0.5, borderColor: '#e6eef7' }}
                     />
                   ) :
      
        <Text className="text-slate-700 font-bold">
          {(item.displayName || 'U')
            .split(' ')
            .map((s: string) => s[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()}
        </Text>}
        {item.online && <View className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border border-white" />}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold text-slate-900">{item.displayName}</Text>
          {item.unreadCount > 0 && (
            <View className="ml-2 min-w-[22px] h-[22px] rounded-full bg-blue-600 items-center justify-center px-1">
              <Text className="text-white text-xs font-bold">{item.unreadCount}</Text>
            </View>
          )}
        </View>

        <View className="flex-row items-center mt-1">
          <Text className="text-sm text-slate-500 flex-1" numberOfLines={1} ellipsizeMode="tail">
          {item.lastMessage
      ? item.lastMessage
      : !item.online && item.lastSeen
        ? `last seen ${moment(item.lastSeen.toDate()).fromNow()}`
        : ''}
          </Text>
          {statusIcon(item.lastMessageStatus, item.lastMessageFrom)}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <HeaderWithSearchInline query={queryText} setQuery={setQueryText} />

      {loading ? (
        <View className="py-4">
          <ActivityIndicator size="small" color="#0B75FF" />
        </View>
      ) : (
        <FlatList
          data={results}
        
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-lg font-semibold text-slate-600 mb-2">No users found</Text>
              <Text className="text-sm text-slate-400 text-center px-6">
                {queryText.trim() ? 'Try a different search' : 'There are no other users to chat with yet.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default UsersListScreen;
