import { StyleSheet } from "react-native";
import { defaultSystemFonts } from "react-native-render-html";
import { LogoWave } from "@/components/Bible";
import Animated from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { RenderHTML } from "react-native-render-html";
import { useWindowDimensions } from "react-native";
import { useEffect, useState } from "react";
import { useBottomTabOverflow } from "@/components/ui/TabBarBackground";

export default function HomeScreen() {
    const [text, setText] = useState("");
    const [title, setTitle] = useState("");

    const { width } = useWindowDimensions();
    const bottom = useBottomTabOverflow();
    const systemFonts = [...defaultSystemFonts, "Arial", "Times New Roman"];

    useEffect(() => {
        async function load() {
            const response = await fetch("http://localhost:8000/mobile/ss");
            const json = await response.json();

            console.log(json);

            if (json.response.sundaySchool) {
                setText(json.response.sundaySchool.text);
                setTitle(json.response.sundaySchool.title);
            }
        }
        load();
    }, []);

    return (
        <ThemedView style={styles.container}>
            <Animated.ScrollView
                contentContainerStyle={{ paddingTop: bottom, paddingBottom: bottom }}
            >
                <ThemedView style={styles.titleContainer}>
                    <ThemedText
                        lightColor={"#000000ff"}
                        darkColor={"#ffffffff"}
                        type="title"
                    >
                        Sunday School
                    </ThemedText>
                    <LogoWave />
                </ThemedView>

                <ThemedView style={styles.content}>
                    <RenderHTML
                        systemFonts={systemFonts}
                        contentWidth={width}
                        source={{
                            html: `
                      <h2>${title}</h2>
                      <p>${text}</p>
                    `,
                        }}
                        tagsStyles={{
                            h2: {
                                alignSelf: "center",
                                color: "black",
                                fontSize: 22,
                                fontWeight: "bold",
                            },
                        }}
                    />
                </ThemedView>
            </Animated.ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    titleContainer: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "transparent",
        paddingLeft: 15,
        paddingRight: 15,
    },
    container: {
        flex: 1,
    },
    content: {
        padding: 32,
        overflow: "hidden",
    },
});
