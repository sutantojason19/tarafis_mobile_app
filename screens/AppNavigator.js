import { createStackNavigator } from '@react-navigation/stack';
import MenuScreen from './MenuTabs';
import Form1Screen from './forms/Form1Screen';
import Form2Screen from './forms/Form2Screen';
import Form3Screen from './forms/Form3Screen';
import Form4Screen from './forms/Form4Screen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Menu" component={MenuScreen} />
      <Stack.Screen name="Form1" component={Form1Screen} />
      <Stack.Screen name="Form2" component={Form2Screen} />
      <Stack.Screen name="Form3" component={Form3Screen} />
      <Stack.Screen name="Form4" component={Form4Screen} />
    </Stack.Navigator>
  );
}

