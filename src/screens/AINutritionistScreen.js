/**
 * AI Nutritionist Screen - Standalone chat with nutrition expert AI
 * Features: Text chat, image upload, voice output (TTS), free tier limits
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { cloudflareAPI } from '../services/cloudflareAPI';
import { STORAGE_KEYS } from '../config/asyncStorageConfig';
import {
  getAIChatUsage,
  useAIChatMessage,
  saveChatHistory,
  loadChatHistory,
  clearChatHistory,
} from '../utils/aiChatManager';

const WELCOME_MESSAGE = {
  type: 'ai',
  text: "Hi! I'm your AI Nutritionist. Ask me anything about nutrition, diet, healthy eating, or upload food photos for analysis!",
  timestamp: Date.now(),
};

const AINutritionistScreen = () => {
  const navigation = useNavigation();
  const scrollViewRef = useRef();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState({ remaining: 0, total: 3, isPremium: false });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const suggestedQuestions = [
    "What's the healthiest breakfast?",
    'Is intermittent fasting safe?',
    'How much protein do I need daily?',
    'Best foods for heart health?',
    'Are artificial sweeteners bad?',
    'Vegan protein sources?',
  ];

  useEffect(() => {
    const init = async () => {
      await loadUsageStats();
      const result = await loadChatHistory();
      if (result.success && result.messages.length > 0) {
        setMessages(result.messages);
      } else {
        setMessages([WELCOME_MESSAGE]);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.resetAIChat = resetAIChatCounter;
    }
  }, []);

  const loadUsageStats = async () => {
    const stats = await getAIChatUsage();
    setUsage(stats);
  };

  const resetAIChatCounter = async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AI_CHAT_MESSAGES_SENT,
        STORAGE_KEYS.AI_CHAT_LAST_RESET,
        STORAGE_KEYS.AI_CHAT_HISTORY,
      ]);
      await loadUsageStats();
      setMessages([{ ...WELCOME_MESSAGE, timestamp: Date.now() }]);
    } catch (error) {
      console.error('Reset error:', error);
    }
  };

  const autoSpeakMessage = async (text) => {
    if (Platform.OS === 'web' || !text) return;

    try {
      await Speech.stop();
      setIsSpeaking(true);
      Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      console.error('Auto speech error:', error);
      setIsSpeaking(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && !selectedImage) return;

    // AI chat is coming soon — show notice for everyone
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const userMessage = {
      type: 'user',
      text: inputText.trim(),
      image: selectedImage,
      timestamp: Date.now(),
    };
    const comingSoonMsg = {
      type: 'ai',
      text: '✨ AI messaging is coming soon! You will be able to send messages here shortly. Stay tuned!',
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage, comingSoonMsg]);
    setInputText('');
    setSelectedImage(null);
  };

  const handleSuggestedQuestion = (question) => {
    setInputText(question);
  };

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo library access to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSpeak = async (text) => {
    if (Platform.OS === 'web') {
      Alert.alert('Text-to-Speech', 'Voice output is only available on iOS and Android devices.');
      return;
    }

    try {
      Haptics.selectionAsync();
      if (isSpeaking) {
        await Speech.stop();
        setIsSpeaking(false);
        return;
      }

      setIsSpeaking(true);
      Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => {
          setIsSpeaking(false);
          Alert.alert('Speech Error', 'Unable to play audio. Please try again.');
        },
      });
    } catch (error) {
      setIsSpeaking(false);
      Alert.alert('Error', 'Unable to use text-to-speech.');
    }
  };


  const handleClearChat = () => {
    Alert.alert('Clear Chat', 'Delete all messages? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          setMessages([{ ...WELCOME_MESSAGE, timestamp: Date.now() }]);
          await clearChatHistory();
        },
      },
    ]);
  };

  const isGreetingOnly = messages.length <= 1 && messages[0]?.type === 'ai';

  const renderMessage = (message, index) => {
    const isUser = message.type === 'user';
    const isError = message.isError;
    return (
      <View
        key={index}
        style={[
          an.bubble,
          isUser ? an.bubbleUser : an.bubbleAI,
          isError && an.bubbleError,
        ]}
      >
        {message.image && <Image source={{ uri: message.image }} style={an.bubbleImage} />}
        <Text style={[an.bubbleText, isUser && an.bubbleTextUser]}>{message.text}</Text>
        {!isUser && !isError && (
          <TouchableOpacity style={{ marginTop: 8 }} onPress={() => handleSpeak(message.text)}>
            <Ionicons
              name={isSpeaking ? 'volume-high' : 'volume-medium-outline'}
              size={16}
              color="#e2e2e2"
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={an.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* -- HEADER -- */}
      <SafeAreaView style={an.headerSafe}>
        <View style={an.header}>
          <View style={an.headerLeft}>
            <Ionicons name="leaf" size={18} color="#4CAF50" />
            <Text style={an.headerTitle}>AI Nutritionist</Text>
          </View>
          <TouchableOpacity
            onPress={handleClearChat}
            style={an.avatarBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={16} color="#a0a0a0" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* -- MAIN SCROLL -- */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={an.scrollContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Greeting block � always visible at top */}
          {isGreetingOnly && (
            <>
              <View style={an.greetSection}>
                <Text style={an.greetTitle}>AI NUTRITIONIST</Text>
                <Text style={an.greetBody}>What would you like to know?</Text>
              </View>

              {/* Suggested queries */}
              <View style={an.suggestSection}>
                <Text style={an.suggestLabel}>SUGGESTED QUERIES</Text>
                <View style={an.pillRow}>
                  {suggestedQuestions.slice(0, 4).map((q, i) => (
                    <TouchableOpacity
                      key={i}
                      style={an.pill}
                      onPress={() => handleSuggestedQuestion(q)}
                      activeOpacity={0.75}
                    >
                      <Text style={an.pillText}>{q.replace("What's the healthiest breakfast?", "Healthiest breakfast?").replace("Is intermittent fasting safe?", "Intermittent fasting").replace("How much protein do I need daily?", "Protein calculation")}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>


            </>
          )}

          {/* Chat messages */}
          {!isGreetingOnly && messages.map((msg, idx) => renderMessage(msg, idx))}

          {loading && (
            <View style={an.bubbleAI}>
              <ActivityIndicator size="small" color="#c6c6c6" />
              <Text style={[an.bubbleText, { marginTop: 6 }]}>Analyzing�</Text>
            </View>
          )}
        </ScrollView>

        {/* -- IMAGE PREVIEW -- */}
        {selectedImage && (
          <View style={an.imagePreviewWrap}>
            <Image source={{ uri: selectedImage }} style={an.imagePreview} />
            <TouchableOpacity style={an.imagePreviewRemove} onPress={() => setSelectedImage(null)}>
              <Ionicons name="close-circle" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* -- INPUT BAR -- */}
        <View style={an.inputWrap}>
          <TouchableOpacity onPress={handleImagePick} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Ionicons name="mic-outline" size={22} color="#919191" />
          </TouchableOpacity>

          <TextInput
            style={an.input}
            placeholder="Command Nutritionist..."
            placeholderTextColor="rgba(145,145,145,0.6)"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
          />

          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() && !selectedImage}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() || selectedImage ? '#ffffff' : '#474747'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

/* =========================================
   STYLES � AURA NOIR AI Nutritionist
   ========================================= */
const an = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },

  /* Header */
  headerSafe: {
    backgroundColor: 'rgba(10,10,10,0.9)',
    zIndex: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(240,240,240,0.8)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Scroll */
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    gap: 48,
  },

  /* Greeting */
  greetSection: {
    gap: 14,
  },
  greetTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#a0a0a0',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  greetBody: {
    fontSize: 40,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -1,
    lineHeight: 46,
  },

  /* Suggestions */
  suggestSection: {
    gap: 16,
  },
  suggestLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#919191',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e2e2e2',
  },

  /* Premium */
  premiumSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(71,71,71,0.3)',
    paddingTop: 28,
    gap: 16,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  premiumBody: {
    fontSize: 13,
    color: '#c6c6c6',
    lineHeight: 20,
    fontWeight: '500',
  },
  premiumCta: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 3,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.5)',
    alignSelf: 'flex-start',
    paddingBottom: 4,
  },

  /* Chat bubbles */
  bubble: {
    maxWidth: '80%',
    padding: 14,
    marginBottom: 12,
    borderRadius: 18,
  },
  bubbleAI: {
    alignSelf: 'flex-start',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bubbleError: {
    backgroundColor: '#1a0a0a',
    borderColor: '#ff4444',
  },
  bubbleText: {
    fontSize: 14,
    color: '#c6c6c6',
    lineHeight: 21,
  },
  bubbleTextUser: {
    color: '#e2e2e2',
  },
  bubbleImage: {
    width: '100%',
    height: 140,
    borderRadius: 2,
    marginBottom: 8,
  },

  /* Image preview */
  imagePreviewWrap: {
    marginHorizontal: 24,
    marginBottom: 8,
  },
  imagePreview: {
    width: 72,
    height: 72,
    borderRadius: 2,
  },
  imagePreviewRemove: {
    position: 'absolute',
    top: -6,
    left: 62,
  },

  /* Input */
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 24,
    marginBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#e2e2e2',
    letterSpacing: 0.3,
    maxHeight: 80,
    padding: 0,
  },
});

export default AINutritionistScreen;