import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { BRAND } from "../styles/colors";
import { globalStyles as styles } from "../styles/globalStyles";
import type { Theme } from "../styles/theme";
import type { useProfile } from "../hooks/useProfile";

export type BmiAdvice = {
  title: string;
  message: string;
  foods: string[];
  drinks: string[];
} | null;

type BmiCardProps = {
  theme: Theme;
  profile: ReturnType<typeof useProfile>;
  bmiResult: string | null;
  bmiCategory: string;
  idealWeight: string;
  advice: BmiAdvice;
  onCalculate: () => void;
};

export const BmiCard = ({
  theme,
  profile,
  bmiResult,
  bmiCategory,
  idealWeight,
  advice,
  onCalculate,
}: BmiCardProps) => (
  <View style={[styles.card, { backgroundColor: theme.card }]}>
    <View style={styles.cardHeader}>
      <View
        style={[styles.iconCircle, { backgroundColor: BRAND.primarySoft }]}
      >
        <MaterialCommunityIcons
          name="human-male-height"
          size={27}
          color={BRAND.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          Kalkulator BMI
        </Text>
        <Text style={[styles.cardSubtitle, { color: theme.muted }]}>
          Cek indeks massa tubuh
        </Text>
      </View>
    </View>

    <View style={styles.row}>
      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.genderBtn,
          {
            borderColor: profile.gender === "Pria" ? BRAND.male : theme.border,
            backgroundColor:
              profile.gender === "Pria" ? BRAND.male : theme.input,
          },
        ]}
        onPress={() => profile.setGender("Pria")}
      >
        <FontAwesome5
          name="male"
          size={20}
          color={profile.gender === "Pria" ? "#fff" : BRAND.male}
        />
        <Text
          style={[
            styles.genderText,
            { color: profile.gender === "Pria" ? "#fff" : BRAND.male },
          ]}
        >
          Pria
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.genderBtn,
          {
            borderColor:
              profile.gender === "Wanita" ? BRAND.female : theme.border,
            backgroundColor:
              profile.gender === "Wanita" ? BRAND.female : theme.input,
          },
        ]}
        onPress={() => profile.setGender("Wanita")}
      >
        <FontAwesome5
          name="female"
          size={20}
          color={profile.gender === "Wanita" ? "#fff" : BRAND.female}
        />
        <Text
          style={[
            styles.genderText,
            { color: profile.gender === "Wanita" ? "#fff" : BRAND.female },
          ]}
        >
          Wanita
        </Text>
      </TouchableOpacity>
    </View>

    <View style={styles.row}>
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.muted }]}>Usia</Text>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.input,
            },
          ]}
          keyboardType="numeric"
          value={profile.age}
          onChangeText={profile.setAge}
          placeholder="Tahun"
          placeholderTextColor={theme.muted}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.muted }]}>Berat</Text>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.input,
            },
          ]}
          keyboardType="decimal-pad"
          value={profile.weight}
          onChangeText={profile.setWeight}
          placeholder="Kg"
          placeholderTextColor={theme.muted}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.muted }]}>Tinggi</Text>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.input,
            },
          ]}
          keyboardType="decimal-pad"
          value={profile.height}
          onChangeText={profile.setHeight}
          placeholder="Cm"
          placeholderTextColor={theme.muted}
        />
      </View>
    </View>

    <TouchableOpacity
      style={[styles.primaryBtn, { backgroundColor: BRAND.primary }]}
      onPress={onCalculate}
    >
      <MaterialCommunityIcons
        name="calculator-variant"
        size={19}
        color="#fff"
      />
      <Text style={styles.primaryBtnText}>Hitung BMI</Text>
    </TouchableOpacity>

    {bmiResult && (
      <View style={[styles.resultBox, { backgroundColor: theme.result }]}>
        <Text style={[styles.resultSmall, { color: theme.muted }]}>
          HASIL BMI
        </Text>
        <Text style={[styles.resultBmiText, { color: BRAND.primary }]}>
          {bmiResult}
        </Text>
        <Text style={[styles.resultCategory, { color: theme.text }]}>
          {bmiCategory}
        </Text>
        <Text style={[styles.resultIdeal, { color: theme.muted }]}>
          Rentang berat ideal ({profile.gender}): {idealWeight}
        </Text>

        {advice && (
          <View style={[styles.adviceBox, { borderTopColor: theme.border }]}>
            <View style={styles.adviceTitleRow}>
              <MaterialCommunityIcons
                name="lightbulb-on-outline"
                size={20}
                color={BRAND.warning}
              />
              <Text style={[styles.adviceTitle, { color: theme.text }]}>
                {advice.title}
              </Text>
            </View>

            <Text style={[styles.adviceMessage, { color: theme.muted }]}>
              {advice.message}
            </Text>

            <Text style={[styles.foodTitle, { color: theme.text }]}>
              Makanan yang dapat dipilih
            </Text>
            <View style={styles.chipWrap}>
              {advice.foods.map((food) => (
                <View
                  key={food}
                  style={[styles.chip, { backgroundColor: BRAND.primarySoft }]}
                >
                  <Text
                    style={[styles.chipText, { color: BRAND.primaryDark }]}
                  >
                    {food}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={[styles.foodTitle, { color: theme.text }]}>
              Pilihan minuman
            </Text>
            <View style={styles.chipWrap}>
              {advice.drinks.map((drink) => (
                <View
                  key={drink}
                  style={[styles.chip, { backgroundColor: BRAND.primarySoft }]}
                >
                  <Text
                    style={[styles.chipText, { color: BRAND.primaryDark }]}
                  >
                    {drink}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={[styles.disclaimer, { color: theme.muted }]}>
              Catatan: pada usia di bawah 18 tahun, BMI tidak sebaiknya
              ditafsirkan dengan kategori dewasa saja. Gunakan hasil ini sebagai
              informasi awal, bukan diagnosis medis.
            </Text>
          </View>
        )}
      </View>
    )}
  </View>
);