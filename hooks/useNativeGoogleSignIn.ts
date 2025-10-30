import { useState } from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useApiGoogleLogin } from '@/api/auth/login-google';
import { useRouter } from 'expo-router';

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
  const { mutate, mutateAsync } = useApiGoogleLogin();
  const router = useRouter();

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
        // await handleSignInWithToken(idToken);
        await mutateAsync(
          { token: idToken },
          {
            onSuccess(data, variables, context) {
              return;
            },
            onError(error) {
              setError('Failed to sign in with Google');
              console.error('Google Sign-In Error:');
              return;
            },
          }
        );
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

  //   const handleSignInWithToken = async (idToken: string) => {
  //     mutate(
  //       { token: idToken },
  //       {
  //         onSuccess(data) {
  //           router.push("/(tabs)");
  //           dispatch(setAccessToken(data.accessToken));
  //           setData("sessionId", data.tokenSession.id);
  //         },
  //       }
  //     );
  //   };

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.error('Sign-out Error:', error);
    }
  };

  return { signIn, signOut, loading, error };
};
