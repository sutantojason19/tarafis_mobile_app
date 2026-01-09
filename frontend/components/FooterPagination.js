/**
 * FooterPagination Component
 * ---------------------------
 * A reusable footer used for multi-step forms (pagination-style navigation).
 *
 * Features:
 * - Displays a "Back" button and either a "Next" or "Submit" button.
 * - Automatically switches the right button to "Submit" when `page === 3`.
 * - Accepts multiple prop name variations for better compatibility with parents.
 *   (e.g., onBackPress, onLeft, onPrevious all map to onBack)
 *
 * Props:
 *  @param {number} page                  - Current page index (used to determine if it's the last page).
 *
 *  Navigation Callbacks (flexible naming):
 *  @param {function} onBack              - Invoked when the Back button is pressed.
 *  @param {function} onNext              - Invoked when the Next button is pressed.
 *  @param {function} onSubmit            - Invoked on final page instead of Next.
 *
 *  Disabled State:
 *  @param {boolean} leftDisabled         - When true, disables and fades the Back button.
 *
 * Behavior:
 * - If parent doesn't provide callbacks, the component safely defaults them to no-op functions.
 * - The component supports multiple possible prop names so parent components don't break
 *   when using different naming conventions.
 *
 * UI Notes:
 * - Buttons are evenly spaced using flex: 1.
 * - Includes slight elevation/shadow for modern UI appearance.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

const PRIMARY = "#3B82F6";

export default function FooterPagination(props) {
  // Extract props with fallbacks to alternate prop names
  const {
    page = 1,

    // Flexible mapping for Back button callback
    onBack = props.onLeftPress || props.onBackPress || props.onLeft || props.onPrevious,

    // Flexible mapping for Next button callback
    onNext = props.onRightPress || props.onNextPress || props.onRight || props.onForward,

    // Flexible mapping for Submit callback
    onSubmit = props.onSubmit || props.onFinish || props.onConfirm,

    onSave = props.onSave || props.onDraft || props.onTempSave,


    // Flexible mapping for disabling the Back button
    leftDisabled =
      typeof props.leftDisabled !== "undefined"
        ? props.leftDisabled
        : props.disabledBack || props.leftDisabled || false,
  } = props;

  const isLastPage = page === 3;

  // Safe fallback handlers so undefined functions are never called.
  const handleBack = onBack || (() => {});
  const handleNext = onNext || (() => {});
  const handleSubmit = onSubmit || (() => {});
  const handleSave = onSave || (() => {});


  return (
    <View style={styles.container}>

      {/* Back Button */}
      <TouchableOpacity
        onPress={handleBack}
        disabled={leftDisabled}
        activeOpacity={0.8}
        style={[
          styles.backButton,
          leftDisabled && styles.disabledBack, // Visual disabled state
        ]}
      >
        <Text
          style={[
            styles.backText,
            leftDisabled && styles.disabledBackText, // Dim text when disabled
          ]}
        >
          Back
        </Text>
      </TouchableOpacity>

      {/* Next or Submit Button depending on current page */}
      {!isLastPage ? (
        <TouchableOpacity
          onPress={handleNext}
          style={styles.nextButton}
          activeOpacity={0.9}
        >
          <Text style={styles.nextText}>Next</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.lastPageGroup}>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.nextButton, {backgroundColor: '#63bf3c'}]}
            activeOpacity={0.9}
          >
            <Text style={styles.nextText}>Save</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleSubmit}
            style={styles.nextButton}
            activeOpacity={0.9}
          >
            <Text style={styles.nextText}>Submit</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------
 * Styles
 * ------------------------------------------------------------------ */
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

    // Subtle shadow for card-like appearance
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },

  disabledBack: {
    opacity: 0.6, // slightly faded look when disabled
  },

  backText: {
    color: "#111827",
    fontWeight: "600",
  },

  disabledBackText: {
    color: "#9ca3af", // muted text color when disabled
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

  lastPageGroup: {
    flexDirection: 'row',
    flex: 2,             // ← makes Save + Submit take same total space as Back
    gap: 8
  },

saveButton: {
  backgroundColor: '#63bf3c',
  marginRight: 10,
},

});
