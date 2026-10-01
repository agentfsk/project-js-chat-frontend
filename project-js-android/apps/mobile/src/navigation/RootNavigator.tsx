import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { LoginScreen } from '../screens/LoginScreen'
import { SignupScreen } from '../screens/SignupScreen'
import { ChatListScreen } from '../screens/ChatListScreen'
import { ChatScreen } from '../screens/ChatScreen'
import { ContactsScreen } from '../screens/ContactsScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { CreateGroupModal } from '../screens/CreateGroupModal'
import { GroupInfoModal } from '../screens/GroupInfoModal'
import { InviteMembersModal } from '../screens/InviteMembersModal'
import { ProfileModal } from '../screens/ProfileModal'
import { EditProfileModal } from '../screens/EditProfileModal'
import { CallIncomingScreen } from '../screens/CallIncomingScreen'
import { CallActiveScreen } from '../screens/CallActiveScreen'
import { useAuthStore } from '@shared/store/auth'

const AuthStack = createNativeStackNavigator()
const MainTabs = createBottomTabNavigator()
const ChatStack = createNativeStackNavigator()
const ContactsStack = createNativeStackNavigator()
const SettingsStack = createNativeStackNavigator()
const ModalStack = createNativeStackNavigator()

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  )
}

function ChatsNavigator() {
  return (
    <ChatStack.Navigator>
      <ChatStack.Screen name="ChatList" component={ChatListScreen} options={{ headerShown: false }} />
      <ChatStack.Screen name="Chat" component={ChatScreen} />
      <ChatStack.Screen name="CreateGroup" component={CreateGroupModal} options={{ presentation: 'modal' }} />
      <ChatStack.Screen name="GroupInfo" component={GroupInfoModal} options={{ presentation: 'modal' }} />
      <ChatStack.Screen name="InviteMembers" component={InviteMembersModal} options={{ presentation: 'modal' }} />
    </ChatStack.Navigator>
  )
}

function ContactsNavigator() {
  return (
    <ContactsStack.Navigator>
      <ContactsStack.Screen name="Contacts" component={ContactsScreen} options={{ headerShown: false }} />
      <ContactsStack.Screen name="Profile" component={ProfileModal} options={{ presentation: 'modal' }} />
      <ContactsStack.Screen name="EditProfile" component={EditProfileModal} options={{ presentation: 'modal' }} />
    </ContactsStack.Navigator>
  )
}

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
    </SettingsStack.Navigator>
  )
}

function MainTabsNavigator() {
  return (
    <MainTabs.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#7dd3fc',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: { backgroundColor: '#0f1115', borderTopWidth: 0 },
      })}
    >
      <MainTabs.Screen name="Chats" component={ChatsNavigator} options={{ title: 'Чаты' }} />
      <MainTabs.Screen name="Contacts" component={ContactsNavigator} options={{ title: 'Контакты' }} />
      <MainTabs.Screen name="Settings" component={SettingsNavigator} options={{ title: 'Настройки' }} />
    </MainTabs.Navigator>
  )
}

function CallModalNavigator() {
  return (
    <ModalStack.Navigator screenOptions={{ presentation: 'transparentModal', headerShown: false }}>
      <ModalStack.Screen name="CallIncoming" component={CallIncomingScreen} />
      <ModalStack.Screen name="CallActive" component={CallActiveScreen} />
    </ModalStack.Navigator>
  )
}

export function RootNavigator() {
  const token = useAuthStore((state) => state.token)

  return (
    <>
      {token ? (
        <>
          <MainTabsNavigator />
          <CallModalNavigator />
        </>
      ) : (
        <AuthNavigator />
      )}
    </>
  )
}