import React from 'react';
import { StyleSheet, Text, View } from "react-native"

interface ProgressStepperProps {
    currentStep: number;
    totalSteps: number;
    stepItems?: string[];
}

export function ProgressStepper(props: ProgressStepperProps) {
    const total = props.totalSteps > 0 ? props.totalSteps : (props.stepItems?.length || 4);
    const steps = Array.from({ length: total });

    return (
        <View style={styles.container}>
            <Text style={styles.titleText}>
                LANGKAH {props.currentStep} DARI {total}
            </Text>
            
            <View style={styles.stepperRow}>
                {steps.map((_, index) => {
                    const stepNum = index + 1;
                    const isCompleted = stepNum < props.currentStep;
                    const isCurrent = stepNum === props.currentStep;
                    const isFuture = stepNum > props.currentStep;

                    // The line to the right of the circle is active if the NEXT step is already reached or is current
                    const isNextActive = stepNum + 1 <= props.currentStep;
                    
                    return (
                        <View 
                            key={index} 
                            style={[styles.stepWrapper, { flex: index < total - 1 ? 1 : 0 }]}
                        >
                            <View style={[
                                styles.circle,
                                isCompleted && styles.circleCompleted,
                                isCurrent && styles.circleCurrent,
                                isFuture && styles.circleFuture
                            ]}>
                                <Text style={[
                                    styles.stepText,
                                    (isCompleted || isCurrent) && styles.textActive,
                                    isFuture && styles.textFuture
                                ]}>
                                    {stepNum}
                                </Text>
                            </View>
                            
                            {index < total - 1 && (
                                <View style={[
                                    styles.line,
                                    isNextActive ? styles.lineActive : styles.lineInactive
                                ]} />
                            )}
                        </View>
                    );
                })}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#2b2b2b',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#3a3a3a',
        marginVertical: 10,
    },
    titleText: {
        color: '#9c9c9c',
        fontSize: 13,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 20,
        textTransform: 'uppercase',
    },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    circle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleCompleted: {
        backgroundColor: '#125f46',
    },
    circleCurrent: {
        backgroundColor: '#26af81',
    },
    circleFuture: {
        backgroundColor: '#2e2e2e',
        borderWidth: 1,
        borderColor: '#454545',
    },
    stepText: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    textActive: {
        color: '#FFFFFF',
    },
    textFuture: {
        color: '#9e9e9e',
    },
    line: {
        flex: 1,
        height: 2,
    },
    lineActive: {
        backgroundColor: '#26af81',
    },
    lineInactive: {
        backgroundColor: '#4a4a4a',
    }
})