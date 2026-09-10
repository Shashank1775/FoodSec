import React, { useRef, useState } from 'react';
import { View, TouchableWithoutFeedback, Keyboard, StyleSheet, TextInput as RNTextInput } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { AuthScreenProps } from '../../navigation/types';

type Props = AuthScreenProps<'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login, error, isAuthenticating, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const passwordInputRef = useRef<RNTextInput>(null);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleLogin = async () => {
    try {
      setLocalError('');
      clearError();

      if (!email.trim()) {
        setLocalError('Email is required');
        return;
      }

      if (!validateEmail(email)) {
        setLocalError('Please enter a valid email address');
        return;
      }

      if (!password) {
        setLocalError('Password is required');
        return;
      }

      await login(email.trim(), password);
    } catch {
      // AuthContext already stored the message in `error`; nothing else to do here.
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>Welcome Back</Text>
        
        <TextInput
          label="Email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setLocalError('');
            clearError();
          }}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          autoFocus
          returnKeyType="next"
          onSubmitEditing={() => passwordInputRef.current?.focus()}
          style={styles.input}
        />

        <TextInput
          ref={passwordInputRef}
          label="Password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setLocalError('');
            clearError();
          }}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          style={styles.input}
        />

        {(localError || error) && (
          <HelperText type="error" visible={true}>
            {localError || error}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={isAuthenticating}
          disabled={isAuthenticating}
          style={styles.button}
        >
          Login
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Register')}
          disabled={isAuthenticating}
          style={styles.link}
        >
          Don't have an account? Register
        </Button>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    marginBottom: 20,
  },
  link: {
    marginTop: 10,
  },
}); 