import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  }
});

// Default settings
const defaultSettings = [
  { key: "botEnabled", value: true },
  { key: "openaiApiKey", value: "" },
  { key: "useAiForUnknown", value: true },
];

settingsSchema.statics.initializeDefaults = async function () {
  for (const setting of defaultSettings) {
    await this.findOneAndUpdate(
      { key: setting.key },
      setting,
      { upsert: true, new: true }
    );
  }
};

export default mongoose.model("Settings", settingsSchema);
