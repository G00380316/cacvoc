import { StyleSheet } from "react-native";

import { HelloWave } from "@/components/HelloWave";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

export default function HomeScreen() {
    return (
    <ParallaxScrollView
    headerBackgroundColor={{ light: "#ffffffff", dark: "#000000ff" }}
    headerTitle={
        <ThemedView style={styles.titleContainer}>
            <ThemedText
                lightColor={"#000000ff"}
                darkColor={"#ffffffff"}
                type="title"
            >
                Sunday School
            </ThemedText>
            <HelloWave />
            </ThemedView>
        }
        >
        {/* <ThemedView style={styles.stepContainer}>
            <ThemedText type="subtitle">Step 1: Try it</ThemedText>
            <ThemedText>
            Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
            Press{' '}
            <ThemedText type="defaultSemiBold">
                {Platform.select({
                ios: 'cmd + d',
                android: 'cmd + m',
                web: 'F12',
                })}
            </ThemedText>{' '}
            to open developer tools.
            </ThemedText>
        </ThemedView>
        <ThemedView style={styles.stepContainer}>
            <ThemedText type="subtitle">Step 2: Explore</ThemedText>
            <ThemedText>
            {`Tap the Explore tab to learn more about what's included in this starter app.`}
            </ThemedText>
        </ThemedView>
        <ThemedView style={styles.stepContainer}>
            <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
            <ThemedText>
            {`When you're ready, run `}
            <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
            <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
            <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
            <ThemedText type="defaultSemiBold">app-example</ThemedText>.
            </ThemedText>
        </ThemedView> */}
        </ParallaxScrollView>
    );
}

const styles = StyleSheet.create({
    titleContainer: {
        height: 200,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginLeft: 10,
        backgroundColor: "transparent",
        position: "absolute",
    },
    stepContainer: {
        gap: 8,
        marginBottom: 8,
    },
});
