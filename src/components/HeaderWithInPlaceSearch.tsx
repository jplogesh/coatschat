// src/components/HeaderWithInPlaceSearch.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Search, X } from 'lucide-react-native';

const HeaderWithInPlaceSearch = ({ query, setQuery }: { query: string; setQuery: (v: string) => void }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  return (
    <View className="bg-white border-b border-slate-200 px-4 py-3">
      <View className="flex-row items-center">
        {isSearchOpen ? (
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search users..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 h-10 bg-slate-100 rounded-lg px-3 text-slate-900"
            returnKeyType="search"
          />
        ) : (
          <Text className="flex-1 text-lg font-semibold text-black">CoatsChat</Text>
        )}

        <Pressable
          onPress={() => {
            if (isSearchOpen) {
              setQuery('');
              setIsSearchOpen(false);
            } else {
              setIsSearchOpen(true);
            }
          }}
          className="p-2 ml-2"
        >
          {isSearchOpen ? <X size={20} color="#374151" /> : <Search size={20} color="#374151" />}
        </Pressable>
      </View>
    </View>
  );
};

export default HeaderWithInPlaceSearch;
