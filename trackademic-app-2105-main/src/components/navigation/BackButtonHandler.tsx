import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

/**
 * Handles the system back button (Android hardware back / back gesture) so that
 * it navigates within the app instead of exiting. When there is no in-app history,
 * the app will exit.
 */
export default function BackButtonHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") {
      return;
    }

    let listener: { remove: () => Promise<void> } | null = null;

    const setup = async () => {
      listener = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          navigate(-1);
        } else {
          App.exitApp();
        }
      });
    };

    setup();
    return () => {
      listener?.remove();
    };
  }, [navigate]);

  return null;
}
