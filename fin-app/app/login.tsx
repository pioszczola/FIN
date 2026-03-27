import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Colors, Spacing, Radius } from '../constants/theme';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential).catch((err) => {
        Alert.alert('Sign-in error', err.message);
        setLoading(false);
      });
    }
  }, [response]);

  const handleGoogle = () => {
    promptAsync();
  };

  const handleApple = async () => {
    try {
      setLoading(true);
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: cred.identityToken!,
      });
      await signInWithCredential(auth, credential);
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign-in error', err.message);
      }
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>FIN</Text>
        <Text style={styles.subtitle}>Your personal finance tracker</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.btn, styles.btnGoogle]}
          onPress={handleGoogle}
          disabled={!request}
        >
          <Text style={styles.btnTextDark}>Continue with Google</Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={Radius.md}
            style={styles.appleBtn}
            onPress={handleApple}
          />
        )}
      </View>

      <Text style={styles.footer}>
        Your financial data is private and encrypted.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl * 2,
    justifyContent: 'space-between',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.xl * 2,
  },
  logo: {
    fontSize: 64,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  buttons: {
    gap: Spacing.md,
  },
  btn: {
    height: 52,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnGoogle: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnTextDark: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  appleBtn: {
    height: 52,
    width: '100%',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
