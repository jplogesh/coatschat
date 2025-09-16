// src/screens/SettingsScreen.tsx
import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Image, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { launchImageLibrary, Asset, launchCamera } from 'react-native-image-picker';
import { auth, db, storage } from '../../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { Platform } from 'react-native';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { showToast } from '../utils/toast';
import requestPermissionsAndPick from '../components/requestPermissionsAndPick';
import { LucideCamera, LucideLogOut } from 'lucide-react-native';
type Props = {
  // navigation?: any;
};

export const SettingsScreen: React.FC<Props> = () => {
  const { user, signOut } = useAuth();

  const [_uploading, setUploading] = useState(false);
  const [_progress, setProgress] = useState(0);
  const [imageURI,setImageURI]=useState('')

  // memberSince formatting (if you store createdAt as Firestore Timestamp)
  const _memberSince = useMemo(() => {
    try {
      const ts = (user as any)?.createdAt;
      if (!ts) {
        return '';
      }
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleString(undefined, { month: 'long', year: 'numeric' }); // "June 2023"
    } catch {
      return '';
    }
  }, [user]);

const uriToBlob = (uri: string): Promise<Blob> =>
  new Promise((resolve, reject) => {
    // Try fetch() first (works for http/file URIs). If it fails, fallback to XHR for content:// on Android.
    fetch(uri)
      .then(res => res.blob())
      .then(blob => {
        // some platforms may return invalid blob (size 0) — validate
        if (!blob || (blob.size && blob.size === 0)) {
          throw new Error('fetch returned empty blob, will try XHR fallback');
        }
        resolve(blob);
      })
      .catch(() => {
        // XHR fallback (works for content:// Android URIs)
        const xhr = new XMLHttpRequest();
        xhr.onerror = () => reject(new Error('XHR blob fetch failed'));
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status === 200 || xhr.status === 0) {
              try {
                const responseBlob = xhr.response;
                if (responseBlob) resolve(responseBlob);
                else reject(new Error('XHR returned empty response'));
              } catch (e) {
                reject(e);
              }
            } else {
              reject(new Error('XHR failed with status ' + xhr.status));
            }
          }
        };
        xhr.open('GET', uri, true);
        // IMPORTANT - responseType 'blob' makes XHR return a Blob
        xhr.responseType = 'blob';
        xhr.send(null);
      });
  });

const uploadImageAndGetUrl = async (asset: Asset): Promise<string> => {
  if (!asset.uri) throw new Error('No image URI');

  console.log('[upload] asset meta', {
    uri: asset.uri,
    name: asset.fileName,
    size: asset.fileSize,
    type: asset.type,
    platform: Platform.OS,
  });

  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');

  // create a filename
  const extension = asset.fileName?.split('.').pop() ?? 'jpg';
  const filename = `${Date.now()}.${extension}`;
  const path = `avatars/${uid}/${filename}`;
  const sRef = storageRef(storage, path);

  // Convert URI -> Blob (robust)
  let blob: Blob;
  try {
    blob = await uriToBlob(asset.uri);
  } catch (err) {
    console.error('[upload] uriToBlob failed', err);
    throw err;
  }

  // Optional: set contentType metadata (helps server and downloads)
  const metadata = {
    contentType: asset.type || 'image/jpeg',
  };

return new Promise<string>((resolve, reject) => {
  setUploading(true);
  setProgress(0);

  const uploadTask = uploadBytesResumable(sRef, blob, metadata);

  uploadTask.on(
    'state_changed',
    snapshot => {
      const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      setProgress(Math.round(pct));
    },
    error => {
      setUploading(false);
      setProgress(0);
        // log full error object for debugging
      console.error('[upload] uploadTask error', error, {
          code: (error && error.code) || null,
          message: (error && error.message) || null,
      });
      reject(error);
    },
    async () => {
      try {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setUploading(false);
        setProgress(100);
        resolve(url);
      } catch (e) {
        setUploading(false);
        setProgress(0);
        console.error('[upload] getDownloadURL failed', e);
        reject(e);
      }
    },
  );
});
};


async function requestPermissions() {
  if (Platform.OS === 'android') {
  await requestPermissionsAndPick(openCamera, onPickImagePress, showToast);
  }
}


const openCamera = async() => {
  const options = {
    mediaType: 'photo' as const,       // 'photo' | 'video' | 'mixed'
    saveToPhotos: true,       // saves the captured photo/video to gallery
    cameraType: 'back' as const,       // 'back' | 'front'
    includeBase64: false,     // set true if you need base64 string
  };

  launchCamera(options, async(response) => {
    if (response.didCancel) {
      console.log('User cancelled camera picker');
    } else if (response.errorCode) {
      console.log('Camera Error: ', response.errorMessage);
    } else {
      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        console.log('Image URI: ', asset.uri);
        console.log('File name: ', asset.fileName);
        console.log('File size: ', asset.fileSize);
        console.log('Type: ', asset.type);
        setImageURI(asset?.uri || '')
          const url = await uploadImageAndGetUrl(asset);

      // update Firebase Auth profile
      if (auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, { photoURL: url });
        } catch (e) {
          console.warn('updateProfile failed', e);
        }
      }

      // update Firestore users document (merge so we don't clobber other fields)
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) {
          throw new Error('No auth user for updating profile');
        }
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, { photoURL: url, updatedAt: serverTimestamp() }, { merge: true });
      } catch (e) {
        console.warn('Failed to update Firestore user doc with photoURL', e);
      }

      } else {
        console.log('No assets');
      }
    }
  });
};


  const onPickImagePress = async () => {
    try {
      // open image library
      const result = await launchImageLibrary({
        mediaType: 'photo',
        includeBase64: false,
        quality: 0.8,
      });

      if (result.didCancel) {
        return;
      }
      if (!result.assets || result.assets.length === 0) {
      showToast('No image selected');
        return;
      }

      const asset = result.assets[0];
      setImageURI(asset.uri);
      // upload and get URL
      const url = await uploadImageAndGetUrl(asset);

      // update Firebase Auth profile
      if (auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, { photoURL: url });
        } catch (e) {
          console.warn('updateProfile failed', e);
        }
      }

      // update Firestore users document (merge so we don't clobber other fields)
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) {
          throw new Error('No auth user for updating profile');
        }
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, { photoURL: url, updatedAt: serverTimestamp() }, { merge: true });
      } catch (e) {
        console.warn('Failed to update Firestore user doc with photoURL', e);
      }

      showToast('Avatar updated');
    } catch (err: any) {
      console.warn('onPickImagePress err', err);
      // showToast('Error', err.message || 'Failed to upload image');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="px-4">


        {/* Profile area */}
        <View className="items-center mt-6 mb-4">
          <View className="relative">
            {imageURI || user?.photoURL ? (
              <Image
                source={{ uri:imageURI || user.photoURL }}
                className="w-28 h-28 rounded-full"
                style={{ borderWidth: 0.5, borderColor: '#e6eef7' }}
              />
            ) : (
              <View className="w-28 h-28 rounded-full bg-slate-100 items-center justify-center">
                <Text className="text-xl font-bold text-slate-700">
                  {(user?.displayName || 'U').split(' ').map(s => s[0]).slice(0,2).join('').toLocaleUpperCase()}</Text>
              </View>
            )}

            {/* camera edit badge */}
            {/* <TouchableOpacity
              activeOpacity={0.8}
              className="absolute right-0 bottom-0 w-10 h-10 rounded-full bg-[#b3cdee] items-center justify-center"
              onPress={()=>{
                requestPermissions()
                }}
            >
            <LucideCamera size={20} />
            </TouchableOpacity> */}
          </View>
          <Text className="text-lg font-extrabold text-slate-900 mt-4">{user?.displayName ?? 'No name'}</Text>
          <Text className="text-sm text-slate-500 mt-1">{user?.email ?? ''}</Text>
        </View>

        {/* Account Info card */}
        <View className="bg-slate-50 rounded-xl p-4 shadow-sm border border-slate-100">
          <Text className="text-slate-800 font-semibold mb-3">Account Info</Text>

          <View className="border-t border-slate-100" />

          {/* Row: Name */}
          <View className="flex-row justify-between items-center py-4 border-b border-slate-100">
            <View>
              <Text className="text-slate-500 text-sm">Name</Text>
            </View>
            <Text className="text-slate-800 text-sm">{user?.displayName ?? '-'}</Text>
          </View>

          {/* Row: Email */}
          <View className="flex-row justify-between items-center py-4 border-b border-slate-100">
            <View>
              <Text className="text-slate-500 text-sm">Email</Text>
            </View>
            <Text className="text-slate-800 text-sm">{user?.email ?? '-'}</Text>
          </View>

        </View>

        {/* Spacer */}
        <View className="h-8" />

        {/* Logout button (outlined with icon style) */}
        <TouchableOpacity
          className="flex-row items-center gap-2 justify-center border border-blue-500 rounded-lg py-3 mx-2"
          onPress={async () => {
            try {
              await signOut();
            } catch (err) {
              console.warn('Sign out failed', err);
            }
          }}
          activeOpacity={0.85}
        >
          <LucideLogOut size={18} color={'#2563eb'}/>
          <Text className="text-blue-600 font-semibold">Log Out</Text>
        </TouchableOpacity>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
