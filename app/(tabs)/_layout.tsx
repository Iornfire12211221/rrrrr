import { Tabs } from "expo-router";
import { Map, MessageCircle, User } from "lucide-react-native";
import React from "react";
import AuthGuard from "@/components/AuthGuard";

export default function TabLayout() {
  return (
    <AuthGuard>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#007AFF",
          tabBarInactiveTintColor: "#8E8E93",
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#F8F9FA",
            borderTopColor: "#E1E5E9",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 10,
            paddingBottom: 8,
            paddingTop: 8,
            height: 88,
          },
        }}
      >
        <Tabs.Screen
          name="(map)"
          options={{
            title: "Карта",
            tabBarIcon: ({ color }) => <Map size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "Чат",
            tabBarIcon: ({ color }) => <MessageCircle size={24} color={color} />,
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: "Профиль",
            tabBarIcon: ({ color }) => <User size={24} color={color} />,
          }}
        />
      </Tabs>
    </AuthGuard>
  );
}