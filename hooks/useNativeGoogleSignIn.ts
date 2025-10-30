import { useState } from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  useApiGoogleLogin,
  GoogleLoginResponse,
} from '@/api/auth/login-google';
import { useRouter } from 'expo-router';
import { useLicense } from '@/hooks/useLicense';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId:
    '90182123725-rgri2jgmt7k3eicg6j6u1uqce6rpkt5j.apps.googleusercontent.com',
  scopes: ['profile', 'email'],
  offlineAccess: true,
  forceCodeForRefreshToken: false,
  iosClientId:
    '90182123725-756vv1db2deesv0l23vhvmcdnbs1a9pq.apps.googleusercontent.com',
});

export const useNativeGoogleSignIn = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutateAsync } = useApiGoogleLogin();
  const router = useRouter();
  const { setLicenseFromGoogleLogin, refreshLicenseStatus } = useLicense();

  const signIn = async () => {
    console.log('start');
    setLoading(true);
    setError(null);
    try {
      await GoogleSignin.hasPlayServices();
      console.log('userinfo');
      const userInfo = await GoogleSignin.signIn();
      console.log('userinfo');
      const idToken = userInfo.data?.idToken;
      console.log('idToken', idToken);
      if (idToken) {
        const response = await mutateAsync({ token: idToken });

        if (response.success && response.user.expireDate) {
          // Set license from Google login response
          await setLicenseFromGoogleLogin(response.user.expireDate);

          // Force refresh to ensure UI updates
          await refreshLicenseStatus();

          console.log(
            'Google login successful, license set until:',
            response.user.expireDate
          );

          // Navigate to main app with small delay to ensure state updates
          setTimeout(() => {
            router.replace('/');
          }, 200);
        } else {
          setError('Invalid response from server');
        }
      } else {
        setError('Failed to get ID token');
      }
    } catch (e) {
      setError('Failed to sign in with Google');
      console.error('Google Sign-In Errorcc:', e);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.error('Sign-out Error:', error);
    }
  };

  return { signIn, signOut, loading, error };
};
