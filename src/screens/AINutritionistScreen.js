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
  const [chatbotAccess, setChatbotAccess] = useState('loading');

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
      setChatbotAccess('coming_soon');
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
      setIsSpeaking(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && !selectedImage) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const userMessage = {
      type: 'user',
      text: inputText.trim(),
      image: selectedImage,
      timestamp: Date.now(),
    };

    if (chatbotAccess !== 'enabled') {
      const comingSoonMsg = {
        type: 'ai',
        text: 'The AI Nutritionist chat is coming soon for your account! New subscribers get access first. Stay tuned!',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage, comingSoonMsg]);
      setInputText('');
      setSelectedImage(null);
      return;
    }

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setSelectedImage(null);
    setLoading(true);

    try {
      const aiResponse = await cloudflareAPI.chatbot(inputText.trim());
      const aiMessage = {
        type: 'ai',
        text: aiResponse,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      await saveChatHistory([...messages, userMessage, aiMessage]);
      autoSpeakMessage(aiResponse);
    } catch (error) {
      const errorMsg = {
        type: 'ai',
        text: 'Sorry, I had trouble responding. Please check your connection and try again.',
        timestamp: Date.now(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
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
              color="#9ca3af"
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={an.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* HEADER */}
      <SafeAreaView style={an.headerSafe}>
        <View style={an.header}>
          <View style={an.headerLeft}>
            <View style={an.headerIconBox}>
              <Ionicons name="leaf" size={16} color="#067A4F" />
            </View>
            <Text style={an.headerTitle}>AI Nutritionist</Text>
          </View>
          <TouchableOpacity
            onPress={handleClearChat}
            style={an.avatarBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* COMING SOON BANNER — only for old users */}
      {chatbotAccess === 'coming_soon' && (
        <View style={an.comingSoonBanner}>
          <Ionicons name="time-outline" size={14} color="#92400e" />
          <Text style={an.comingSoonBannerText}>Chat is coming soon for your account</Text>
        </View>
      )}

      {/* MAIN SCROLL */}
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
          {isGreetingOnly && (
            <>
              <View style={an.greetSection}>
                <Text style={an.greetTitle}>AI NUTRITIONIST</Text>
                <Text style={an.greetBody}>What would you{'\n'}like to know?</Text>
              </View>

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
                      <Text style={an.pillText}>
                        {q
                          .replace("What's the healthiest breakfast?", 'Healthiest breakfast?')
                          .replace('Is intermittent fasting safe?', 'Intermittent fasting')
                          .replace('How much protein do I need daily?', 'Protein needs')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}

          {!isGreetingOnly && messages.map((msg, idx) => renderMessage(msg, idx))}

          {loading && (
            <View style={an.bubbleAI}>
              <ActivityIndicator size="small" color="#067A4F" />
              <Text style={[an.bubbleText, { marginTop: 6 }]}>Analyzing...</Text>
            </View>
          )}
        </ScrollView>

        {/* IMAGE PREVIEW */}
        {selectedImage && (
          <View style={an.imagePreviewWrap}>
            <Image source={{ uri: selectedImage }} style={an.imagePreview} />
            <TouchableOpacity style={an.imagePreviewRemove} onPress={() => setSelectedImage(null)}>
              <Ionicons name="close-circle" size={22} color="#067A4F" />
            </TouchableOpacity>
          </View>
        )}

        {/* INPUT BAR */}
        <View style={an.inputWrap}>
          <TouchableOpacity onPress={handleImagePick} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Ionicons name="image-outline" size={22} color="#6b7280" />
          </TouchableOpacity>

          <TextInput
            style={an.input}
            placeholder="Ask your nutritionist..."
            placeholderTextColor="#9ca3af"
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
              color={inputText.trim() || selectedImage ? '#067A4F' : '#d1d5db'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const an = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F5F0',
  },

  /* Header */
  headerSafe: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    zIndex: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(45,106,79,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Coming Soon Banner */
  comingSoonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  comingSoonBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },

  /* Scroll */
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 28,
  },

  /* Greeting */
  greetSection: {
    gap: 8,
    paddingHorizontal: 4,
  },
  greetTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#067A4F',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  greetBody: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
    lineHeight: 38,
  },

  /* Suggestions */
  suggestSection: {
    gap: 12,
  },
  suggestLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(45,106,79,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#067A4F',
  },

  /* Chat bubbles */
  bubble: {
    maxWidth: '82%',
    padding: 14,
    marginBottom: 10,
    borderRadius: 18,
  },
  bubbleAI: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#067A4F',
  },
  bubbleError: {
    backgroundColor: '#fff5f5',
    borderColor: '#fca5a5',
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 21,
  },
  bubbleTextUser: {
    color: '#ffffff',
  },
  bubbleImage: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    marginBottom: 8,
  },

  /* Image preview */
  imagePreviewWrap: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  imagePreview: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  imagePreviewRemove: {
    position: 'absolute',
    top: -6,
    left: 62,
  },

  /* Input bar */
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
    maxHeight: 80,
    padding: 0,
  },
});

export default AINutritionistScreen;
