// components/FooterPagination.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

const PRIMARY = "#3B82F6";

export default function FooterPagination(props) {
  // Accept multiple prop name variants so parent and footer don't need exact match
  const {
    page = 1,

    // prefer explicit names, fall back to common alternatives
    onBack = props.onLeftPress || props.onBackPress || props.onLeft || props.onPrevious,
    onNext = props.onRightPress || props.onNextPress || props.onRight || props.onForward,
    onSubmit = props.onSubmit || props.onFinish || props.onConfirm,

    // disabled variants
    leftDisabled = typeof props.leftDisabled !== "undefined"
      ? props.leftDisabled
      : props.disabledBack || props.leftDisabled || false,
  } = props;

  const isLastPage = page === 3;

  // fallback handlers to no-op so we never call undefined
  const handleBack = onBack || (() => {});
  const handleNext = onNext || (() => {});
  const handleSubmit = onSubmit || (() => {});

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity
        onPress={handleBack}
        style={[styles.backButton, leftDisabled && styles.disabledBack]}
        disabled={leftDisabled}
        activeOpacity={0.8}
      >
        <Text style={[styles.backText, leftDisabled && styles.disabledBackText]}>
          Back
        </Text>
      </TouchableOpacity>

      {/* Next / Submit */}
      {!isLastPage ? (
        <TouchableOpacity onPress={handleNext} style={styles.nextButton} activeOpacity={0.9}>
          <Text style={styles.nextText}>Next</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={handleSubmit} style={styles.nextButton} activeOpacity={0.9}>
          <Text style={styles.nextText}>Submit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },

  backButton: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    justifyContent: "center",
    alignItems: "center",

    // slight shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },

  disabledBack: {
    opacity: 0.6,
  },

  backText: {
    color: "#111827",
    fontWeight: "600",
  },

  disabledBackText: {
    color: "#9ca3af",
  },

  nextButton: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },

  nextText: {
    color: "#fff",
    fontWeight: "600",
  },
});
