import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

const APP_LINK = 'https://apps.apple.com/app/healthyscan/id6743047098';

const PLATFORMS = [
  { id: 'whatsapp',  label: 'WhatsApp',  icon: 'logo-whatsapp',            bg: '#E8F8EE', color: '#25D366' },
  { id: 'messenger', label: 'Messenger', icon: 'chatbubble-ellipses-outline', bg: '#EBF3FF', color: '#0084FF' },
  { id: 'sms',       label: 'SMS',       icon: 'chatbox-outline',          bg: '#f2f4f2', color: '#171717' },
  { id: 'email',     label: 'Email',     icon: 'mail-outline',             bg: '#f2f4f2', color: '#171717' },
  { id: 'telegram',  label: 'Telegram',  icon: 'paper-plane-outline',      bg: '#E8F4FC', color: '#229ED9' },
  { id: 'copy',      label: 'Copy link', icon: 'link-outline',             bg: '#f2f4f2', color: '#555' },
];

/**
 * ShareScoreSheet
 *
 * Bottom sheet with 6 share targets: WhatsApp, Messenger, SMS, Email,
 * Telegram, Copy link. All text/link deep links — no image capture needed.
 */
const ShareScoreSheet = ({
  visible,
  onClose,
  score = 0,
  productName = 'Unknown Product',
  brandName,
  verdict = '',
}) => {
  const sheetY = useRef(new Animated.Value(420)).current;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible) {
      sheetY.setValue(420);
      Animated.spring(sheetY, { toValue: 0, damping: 30, stiffness: 300, useNativeDriver: true }).start();
    }
  }, [visible]);

  const close = () => {
    Animated.timing(sheetY, { toValue: 420, duration: 200, useNativeDriver: true }).start(() => {
      onClose?.();
    });
  };

  const shareText = `${productName}${brandName ? ` by ${brandName}` : ''} — Health score ${score}/100${verdict ? ` (${verdict})` : ''} on Vee. Know what's really inside.`;

  const openOrAlert = async (appUrl, webUrl, appName) => {
    try {
      const canOpen = appUrl ? await Linking.canOpenURL(appUrl) : false;
      if (canOpen) {
        await Linking.openURL(appUrl);
      } else if (webUrl) {
        await Linking.openURL(webUrl);
      } else {
        Alert.alert(`${appName} not installed`, `Install ${appName} to share this way.`);
        return;
      }
      close();
    } catch {
      Alert.alert('Couldn\'t open ' + appName, 'Please try again.');
    }
  };

  const shareToSocial = async (platform) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    switch (platform) {
      case 'whatsapp': {
        const text = encodeURIComponent(`${shareText} ${APP_LINK}`);
        await openOrAlert(`whatsapp://send?text=${text}`, `https://wa.me/?text=${text}`, 'WhatsApp');
        return;
      }
      case 'messenger': {
        await openOrAlert(`fb-messenger://share?link=${encodeURIComponent(APP_LINK)}`, null, 'Messenger');
        return;
      }
      case 'sms': {
        const sep = Platform.OS === 'ios' ? '&' : '?';
        await openOrAlert(`sms:${sep}body=${encodeURIComponent(`${shareText} ${APP_LINK}`)}`, null, 'Messages');
        return;
      }
      case 'email': {
        const subject = encodeURIComponent(`${productName} — Health score ${score}/100`);
        const body = encodeURIComponent(`${shareText}\n\n${APP_LINK}`);
        await openOrAlert(`mailto:?subject=${subject}&body=${body}`, null, 'Mail');
        return;
      }
      case 'telegram': {
        const url = `https://t.me/share/url?url=${encodeURIComponent(APP_LINK)}&text=${encodeURIComponent(shareText)}`;
        Linking.openURL(url).catch(() => {});
        close();
        return;
      }
      case 'copy': {
        try {
          await Clipboard.setStringAsync(`${shareText} ${APP_LINK}`);
          setCopied(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => { setCopied(false); close(); }, 900);
        } catch {
          Alert.alert('Couldn\'t copy', 'Please try again.');
        }
        return;
      }
      default:
        return;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={close}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>Share score</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={close} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={18} color="#171717" />
              </TouchableOpacity>
            </View>

            <View style={styles.grid}>
              {PLATFORMS.map((p) => {
                const isCopyDone = p.id === 'copy' && copied;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.item}
                    activeOpacity={0.75}
                    onPress={() => shareToSocial(p.id)}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: p.bg }]}>
                      <Ionicons name={isCopyDone ? 'checkmark' : p.icon} size={24} color={p.color} />
                    </View>
                    <Text style={styles.label}>{isCopyDone ? 'Copied!' : p.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.footer} numberOfLines={1}>
              {productName} · {score}/100{verdict ? ` · ${verdict}` : ''}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 34,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7e5', alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', color: '#171717' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f2f4f2', alignItems: 'center', justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  item: { width: '33.33%', alignItems: 'center', marginBottom: 18, gap: 8 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 12, fontWeight: '500', color: '#525252' },
  footer: { fontSize: 12, color: '#a3a8a3', textAlign: 'center', marginTop: 4 },
});

export default ShareScoreSheet;
