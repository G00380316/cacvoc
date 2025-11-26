import { useEffect } from 'react';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { Image } from 'react-native';


export function LogoWave() {
    const rotationAnimation = useSharedValue(0);

    useEffect(() => {
        rotationAnimation.value = withRepeat(
            withSequence(withTiming(25, { duration: 150 }), withTiming(0, { duration: 150 })),
            4 // Run the animation 4 times
        );
    }, [rotationAnimation]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotationAnimation.value}deg` }],
    }));

    return (
        <Animated.View style={animatedStyle}>
            <Image
                source={require('../assets/images/CacGalwaylogo.png')}
                style={{ width: 50, height: 50 }}
            />
        </Animated.View>
    );
}
