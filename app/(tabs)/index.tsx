import { StyleSheet } from 'react-native';
import { LogoWave } from '@/components/Bible';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { RenderHTML } from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import { useEffect, useState } from 'react';

export default function HomeScreen() {
    const [text, setText] = useState("");
    // const [ssText, setssText] = useState("");
    // const [ssTitle, setssTitle] = useState("");
    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [bibleRef, setbibleRef] = useState("");
    const [byline, setByline] = useState("");
    const [audio, setAudio] = useState(null);

    const { width } = useWindowDimensions();

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
        <ParallaxScrollView
            headerBackgroundColor={{ light: "#ffffffff", dark: "#000000ff" }}
            headerTitle={
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
            }
        >
            <RenderHTML
                contentWidth={width}
                source={{
                    html: `
                      <h2>${title}</h2>
                      ${audio}
                      <p class="date">${date}</p>
                      <p class="bibleRef">${bibleRef}</p>
                      <p class="byline">${byline}</p>
                      <p class="text">${text}</p>
                      <br/><br/>
                    `
                }}
                tagsStyles={{
                    h2: {
                        marginTop: 3,
                        alignSelf: "center",
                        color: "black",
                        fontSize: 22,
                        fontWeight: "bold",
                    },
                    p: {
                        marginVertical: 4,
                        fontSize: 14,
                        color: "black",
                    },
                    ".date": {
                        fontSize: 12,
                        color: "navy",
                        textAlign: "center",
                    },
                    ".bibleRef": {
                        color: "black",
                        textAlign: "center",
                    },
                    ".byline": {
                        color: "blue",
                        fontStyle: "italic",
                        textAlign: "center",
                    },
                    ".text": {
                        marginTop: 10,
                    },
                    div: {
                        alignSelf: "center",
                    },
                    br: {
                        height: 20,
                    },
                }}
            />
        </ParallaxScrollView>
    );
}

const styles = StyleSheet.create({
    titleContainer: {
        height: 190,
        width: '100%',
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "transparent",
        padding: 15
    },
    stepContainer: {
        gap: 8,
        marginBottom: 8,
    },
});
