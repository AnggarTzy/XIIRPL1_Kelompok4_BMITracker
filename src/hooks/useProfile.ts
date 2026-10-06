import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useState } from "react";

import { PROFILE_STORAGE_KEY } from "../constants/config";
import type { Gender, StoredProfile } from "../types";

export const useProfile = () => {
  const [profileName, setProfileName] = useState("Pengguna IFit");
  const [gender, setGender] = useState<Gender>("Pria");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) return;
      const parsed: StoredProfile = JSON.parse(raw);
      if (typeof parsed.profileName === "string") {
        setProfileName(parsed.profileName);
      }
      if (parsed.gender === "Pria" || parsed.gender === "Wanita") {
        setGender(parsed.gender);
      }
      if (typeof parsed.age === "string") setAge(parsed.age);
      if (typeof parsed.weight === "string") setWeight(parsed.weight);
      if (typeof parsed.height === "string") setHeight(parsed.height);
    } catch (e) {
      console.log("Gagal load profile:", e);
    }
  }, []);

  const save = useCallback(async () => {
    try {
      const data: StoredProfile = {
        profileName,
        gender,
        age,
        weight,
        height,
      };
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.log("Gagal simpan profile:", e);
    }
  }, [profileName, gender, age, weight, height]);

  return {
    profileName,
    setProfileName,
    gender,
    setGender,
    age,
    setAge,
    weight,
    setWeight,
    height,
    setHeight,
    load,
    save,
  };
};