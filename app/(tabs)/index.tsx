import { StyleSheet } from 'react-native';
import { defaultSystemFonts } from "react-native-render-html";
import { LogoWave } from '@/components/Bible';
import Animated from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { RenderHTML } from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import { useEffect, useState } from 'react';
import { useBottomTabOverflow } from '@/components/ui/TabBarBackground';

export default function HomeScreen() {
    const [text, setText] = useState("");
    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [bibleRef, setbibleRef] = useState("");
    const [byline, setByline] = useState("");
    const [audio, setAudio] = useState(null);

    const { width } = useWindowDimensions();
    const bottom = useBottomTabOverflow();
    const systemFonts = [...defaultSystemFonts, 'Arial', 'Times New Roman'];

    useEffect(() => {
        async function load() {
            const response = await fetch('http://localhost:8000/mobile/wft')
            const json = await response.json()


            setText(json.response.text);
            setTitle(json.response.title);
            setDate(json.response.date);
            setbibleRef(json.response.bibleRef);
            setByline(json.response.byline);
            setAudio(json.response.audio);
        }
        load();
    }, []);

    return (
        <ThemedView style={styles.container}>
            <Animated.ScrollView
                contentContainerStyle={{ paddingTop: bottom, paddingBottom: bottom }}>
                <ThemedView style={styles.titleContainer}>
                    <ThemedText
                        lightColor={"#000000ff"}
                        darkColor={"#ffffffff"}
                        type="title"
                    >
                        Word for Today
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
                      ${audio}
                      <p class="date">${date}</p>
                      <p class="bibleRef">${bibleRef}</p>
                      <p class="byline" styles={color:"blue"}>${byline}</p>
                      <p class="text">${text}</p>
                      <br/><br/>
                    `
                        }}
                        tagsStyles={{
                            h2: {
                                alignSelf: "center",
                                color: "black",
                                fontSize: 22,
                                fontWeight: "bold",
                            },
                            p: {
                                marginVertical: 4,
                            },
                            div: {
                                alignSelf: "center",
                            },
                            br: {
                                height: 20,
                            },
                        }}
                        classesStyles={{
                            date: {
                                marginVertical: 4,
                                fontSize: 12,
                                color: "blue",
                                textAlign: "center",
                            },
                            bibleRef: {
                                color: "navy",
                                textAlign: "center",
                                marginVertical: 4,
                                fontSize: 14,

                            },
                            byline: {
                                marginVertical: 4,
                                color: "blue",
                                fontStyle: "italic",
                                textAlign: "center",
                                fontSize: 14,
                            },
                            text: {
                                marginTop: 10,
                            },
                        }}
                        renderersProps={{
                            text: {
                                allowFontScaling: true,
                            },
                        }}
                        defaultTextProps={{
                            selectable: false,
                        }}
                    />
                </ThemedView>
            </Animated.ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    titleContainer: {
        width: '100%',
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "transparent",
        paddingLeft: 15,
        paddingRight: 15,
    },
    stepContainer: {
        gap: 8,
        marginBottom: 8,
    },
    container: {
        flex: 1,
    },
    header: {
        overflow: 'hidden',
    },
    content: {
        flex: 1,
        padding: 32,
        gap: 16,
        overflow: 'hidden',
    },
});

