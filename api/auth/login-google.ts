import { useMutation } from '@tanstack/react-query';

const baseUrl = 'http://localhost:3000/api';

export const useApiGoogleLogin = () => {
  return useMutation({
    mutationFn: async (variables: { token: string }) => {
      return await fetch(`${baseUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: variables.token,
        }),
      });
    },
  });
};
