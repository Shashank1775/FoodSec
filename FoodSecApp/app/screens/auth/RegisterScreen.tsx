import React, { useRef, useState } from 'react';
import { View, TouchableWithoutFeedback, Keyboard, StyleSheet, TextInput as RNTextInput } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { AuthScreenProps } from '../../navigation/types';

type Props = AuthScreenProps<'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { register, error, isAuthenticating, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const passwordInputRef = useRef<RNTextInput>(null);
  const confirmPasswordInputRef = useRef<RNTextInput>(null);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleRegister = async () => {
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

      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters long');
        return;
      }

      if (password !== confirmPassword) {
        setLocalError('Passwords do not match');
        return;
      }

      await register(email.trim(), password);
    } catch {
      // AuthContext already stored the message in `error`; nothing else to do here.
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>Create Account</Text>
        
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
          returnKeyType="next"
          onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
          style={styles.input}
        />

        <TextInput
          ref={confirmPasswordInputRef}
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            setLocalError('');
            clearError();
          }}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleRegister}
          style={styles.input}
        />

        {(localError || error) && (
          <HelperText type="error" visible={true}>
            {localError || error}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleRegister}
          loading={isAuthenticating}
          disabled={isAuthenticating}
          style={styles.button}
        >
          Register
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Login')}
          disabled={isAuthenticating}
          style={styles.link}
        >
          Already have an account? Login
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