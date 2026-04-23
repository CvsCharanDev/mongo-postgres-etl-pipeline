import mongoose, { Schema, model } from "mongoose";

// Schemas

const resultTransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    description: { type: String },
    pl: { type: Number },
    prevBalance: { type: Number },
    betFairPl: { type: Number },
    type: { type: String, enum: ["exchange", "bookmaker", "fancy", "casino", "LINE", "Casino", "g_Casino"] },
    commission: { type: Number, maxLength: 10 },
    commissionStatus: { type: String, enum: ["1", "2"], default: "1", maxLength: 1 }, // 1-open, 2-settled
    sportsId: { type: Schema.Types.ObjectId, ref: "Sports" },
    marketId: { type: Schema.Types.ObjectId, ref: "Market", maxLength: 100 },
    roundId: { type: String, maxLength: 100 },
    currencyId: { type: Schema.Types.ObjectId, ref: "Currency" },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const bankAccountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", maxLength: 100 },
    accountNumber: { type: Number, maxLength: 100 },
    accountName: { type: String, maxLength: 100 },
    bankName: { type: String, maxLength: 100 },
    ifscCode: { type: String, maxLength: 100 },
    upiId: { type: String, maxLength: 100 },
    accountType: { type: String, default: "saving", enum: ["saving", "current", "wallet"], maxLength: 15 },
    bankServiceType: { type: String, default: "Bank", enum: ["Bank", "Crypto"], required: false },
    walletAddress: { type: String, maxLength: 550 },
    network: { type: String, maxLength: 50 },
    apiAddress: { type: String },
    amount: { type: Number },
    is_active: { type: String, default: "0", enum: ["0", "1"], maxLength: 5 },
    status: { type: String, enum: ["pending", "rejected", "settled"], maxLength: 15 },
    imageUrl: { type: String, required: false },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const depositSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true, min: 0 },
  remark: { type: String, default: "No Remark" },
  transactionNumber: { type: String, required: true },
  imageUrl: { type: String, required: false },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  depositMethod: { type: String, enum: ["bank", "crypto"], default: "bank" },
  depositedDate: { type: Date, required: true },
  acceptedDate: { type: Date },
  rejectDate: { type: Date },
  acceptedAdmin: { type: Schema.Types.ObjectId, ref: "User" },
  rejectedAdmin: { type: Schema.Types.ObjectId, ref: "User" },
  rejectRemark: { type: String },
  createdAt: { type: Date, default: Date.now },
  cryptoPayment: {
    sessionId: { type: String },
    adminAddress: { type: String },
    sessionStartTime: { type: Date },
    sessionEndTime: { type: Date },
    startTime: { type: Date },
    endTime: { type: Date },
    usdtAmount: { type: Number },
    amount: { type: Number },
    networkType: { type: String },
    cryptoPaymentError: { type: String },
    transactionHash: { type: String },
  },
  directParent: { type: Schema.Types.ObjectId, ref: "User" },
  parents: [
    {
      parent_id: { type: Schema.Types.ObjectId, ref: "User" },
      role: { type: Number, maxLength: 1 },
    },
  ],
});

const withdrawalSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  bankId: { type: Schema.Types.ObjectId, ref: "BankAccount", required: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  withdrawalMethod: { type: String, enum: ["bank", "crypto"], default: "bank" },
  cryptoPayment: {
    sessionId: { type: String },
    adminAddress: { type: String },
    sessionStartTime: { type: Date },
    sessionEndTime: { type: Date },
    startTime: { type: Date },
    endTime: { type: Date },
    usdtAmount: { type: Number },
    transationFee: { type: Number },
    networkType: { type: String },
    cryptoPaymentError: { type: String },
    transactionHash: { type: String },
    transationSuccessDate: { type: Date },
  },
  withdrawalDate: { type: Date, required: true },
  acceptedDate: { type: Date },
  rejectDate: { type: Date },
  acceptedAdmin: { type: Schema.Types.ObjectId, ref: "User" },
  rejectedAdmin: { type: Schema.Types.ObjectId, ref: "User" },
  rejectRemark: { type: String },
  createdAt: { type: Date, default: Date.now },
  directParent: { type: Schema.Types.ObjectId, ref: "User" },
  parents: [
    {
      parent_id: { type: Schema.Types.ObjectId, ref: "User" },
      role: { type: Number, maxLength: 1 },
    },
  ],
});

const exposureSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    marketId: { type: String, maxLength: 100 },
    selectionId: { type: String, maxLength: 100 },
    marketType: { type: String, maxLength: 100 },
    exposure: { type: Number, maxLength: 100 },
    exposureBonus: { type: Number, maxLength: 100 },
    is_clear: { type: Boolean },
    on_hold: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const chipSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    chip: [{ type: Object }],
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const sportBetsSchema = new Schema(
  {
    sportId: { type: Schema.Types.ObjectId, ref: "Sports", maxLength: 100 },
    leagueId: { type: Schema.Types.ObjectId, ref: "League", maxLength: 100 },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", maxLength: 100, index: true },
    marketId: { type: Schema.Types.ObjectId, ref: "Market", maxLength: 100, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", maxLength: 100, index: true },
    marketType: { type: String, maxLength: 100, index: true },
    bettingType: { type: String, maxLength: 100, index: true },
    selection: { type: String, maxLength: 100 },
    selectionType: { type: String, maxLength: 20 },
    selectionId: { type: String },
    customerOrderRef: { type: String },
    betFairId: { type: String, index: true },
    odds: { type: Number, maxLength: 10 },
    stake: { type: Number, maxLength: 10 },
    liability: { type: Number, maxLength: 10 },
    pl: { type: Number, maxLength: 10 },
    commission: { type: Number, maxLength: 10 },
    skip: { type: Number, maxLength: 10 },
    betFairPercentage: { type: Number },
    oddsSize: { type: Number, maxLength: 10 },
    currency: { type: Object },
    betfairCurrency: { type: Object },
    status: { type: String, enum: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"], maxLength: 1, index: true },
    commissionStatus: { type: String, enum: ["1", "2"], default: "1", maxLength: 1 },
    partial: { type: Boolean },
    complete: { type: Boolean, default: false },
    isBonus: { type: Boolean, default: false },
    fancyTypeCode: { type: String },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const sportSettleBetsSchema = new Schema(
  {
    sportId: { type: Schema.Types.ObjectId, ref: "Sports", maxLength: 100 },
    leagueId: { type: Schema.Types.ObjectId, ref: "League", maxLength: 100 },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", maxLength: 100, index: true },
    marketId: { type: Schema.Types.ObjectId, ref: "Market", maxLength: 100, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", maxLength: 100, index: true },
    marketType: { type: String, maxLength: 100, index: true },
    venueId: { type: Schema.Types.ObjectId, ref: "Venue", maxLength: 100 },
    countryId: { type: Schema.Types.ObjectId, ref: "Country", maxLength: 100 },
    runnerId: { type: Schema.Types.ObjectId, ref: "Runner" },
    bettingType: { type: String, maxLength: 100, index: true },
    selection: { type: String, maxLength: 100 },
    selectionType: { type: String, maxLength: 20 },
    selectionId: { type: String },
    customerOrderRef: { type: String },
    betFairId: { type: String, index: true },
    odds: { type: Number, maxLength: 10 },
    stake: { type: Number, maxLength: 10 },
    liability: { type: Number, maxLength: 10 },
    pl: { type: Number, maxLength: 10 },
    commission: { type: Number, maxLength: 10 },
    skip: { type: Number, maxLength: 10 },
    betFairPercentage: { type: Number },
    oddsSize: { type: Number, maxLength: 10 },
    currency: { type: Object },
    betfairCurrency: { type: Object },
    status: { type: String, enum: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"], maxLength: 1, index: true },
    commissionStatus: { type: String, enum: ["1", "2"], default: "1", maxLength: 1 },
    partial: { type: Boolean },
    complete: { type: Boolean, default: false },
    isBonus: { type: Boolean, default: false },
    fancyTypeCode: { type: String },
    isHorseRace: { type: Boolean, required: false, default: false },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const gapCasinoTransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", maxLength: 100 },
    gameId: { type: String },
    name: { type: String },
    gameCode: { type: String },
    roundId: { type: String },
    txnId: { type: String },
    reqId: { type: String },
    category: { type: String },
    providerName: { type: String },
    subProviderName: { type: String },
    urlThumb: { type: String },
    enabled: { type: Boolean },
    stake: { type: Number, maxLength: 10 },
    pl: { type: Number, maxLength: 10 },
    currency: { type: Object },
    description: { type: String },
    token: { type: String },
    status: { type: String, enum: ["1", "2", "3", "4", "5", "9"], maxLength: 1 },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const gapCasinoSchema = new Schema(
  {
    gameId: { type: String },
    name: { type: String },
    gameCode: { type: String },
    category: { type: String },
    providerName: { type: String },
    subProviderName: { type: String },
    urlThumb: { type: String },
    status: { type: Boolean },
    token: { type: String },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const casinoBetsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", maxLength: 100 },
    providerCode: { type: String },
    gameCode: { type: String },
    roundId: { type: String },
    txnId: { type: String },
    stake: { type: Number, maxLength: 10 },
    pl: { type: Number, maxLength: 10 },
    currency: { type: Object },
    description: { type: String },
    status: { type: String, enum: ["1", "2", "3", "4", "5"], maxLength: 1 },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const loginHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    loginDetails: [{ type: Object }],
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, maxLength: 100 },
    username: { type: String, required: true, unique: true, maxLength: 100 },
    email: { type: String, maxLength: 100 },
    groupName: { type: String, maxLength: 100 },
    TFA_email: { type: String, maxLength: 100 },
    password: { type: String, required: true, maxLength: 100 },
    passwordText: { type: String, maxLength: 100 },
    mobileNo: { type: Number, maxLength: 15 },
    emailVerify: { type: Date, default: null },
    role: { type: Number, enum: [1, 2, 3, 4, 5, 6, 7, 1.1, 1.2, 1.25, 1.3, 1.4, 1.9], required: true },
    parents: [
      {
        parent_id: { type: Schema.Types.ObjectId, ref: "User" },
        role: { type: Number, maxLength: 1 },
      },
    ],
    bonus: { type: Number },
    directParent: {
      parent_id: { type: Schema.Types.ObjectId, ref: "User" },
      role: { type: Number, maxLength: 1 },
    },
    whiteLabelId: { type: Schema.Types.ObjectId, ref: "WhiteLabel" },
    colorSharingSetting: {
      level1: { type: Number, min: 0, default: 0 },
      level2: { type: Number, min: 0, default: 0 },
      level3: { type: Number, min: 0, default: 0 },
      level4: { type: Number, min: 0, default: 0 },
    },
    currencyId: { type: Schema.Types.ObjectId, ref: "Currency" },
    sportShares: { type: Number, required: false, min: 0, max: 100 },
    betFairShare: { type: Number, required: false, min: 0, max: 100 },
    commissionPercentage: { type: Number, required: false, min: 0, max: 1 },
    casino: { type: [Number], required: true }, // 0-All Casino 1-Live Casino, 2- Indian Casino
    creditReference: { type: Number, required: false, min: 0, max: 100000000000 },
    balance: { type: Number, required: false, min: 0, max: 200000000000 },
    cash: { type: Number, required: false },
    exposureLimit: { type: String, required: false },
    sessionCommission: { type: Number, required: false },
    ip_address: {
      system_ip: { type: String, default: null },
      browser_ip: { type: String, default: null },
    },
    last_login: { type: Date },
    token: { type: String },
    gap_casino_token: { type: String },
    twoFactorAuthPassword: { type: String },
    twoFactor_is_Enabled: { type: String, enum: ["enabled", "disabled"] },
    status: { type: String, default: "0", enum: ["0", "1", "2"] },
    monitoring_manager_accessibility: { type: String, enum: ["1", "2"] },
    layer_accessbility_ids: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    betAllow: { type: Boolean, default: true },
    chipSetting: { type: Schema.Types.ObjectId, ref: "ChipSetting" },
    bankAccount: { type: Schema.Types.ObjectId, ref: "BankAccount" },
    sportsBetting: [
      {
        type: Schema.Types.ObjectId,
        ref: "SportBets",
      },
    ],
    casinoBetting: [
      {
        type: Schema.Types.ObjectId,
        ref: "CasinoBets",
      },
    ],
    exposure: [
      {
        type: Schema.Types.ObjectId,
        ref: "Exposure",
      },
    ],
    resultTransaction: [
      {
        type: Schema.Types.ObjectId,
        ref: "ResultTransaction",
      },
    ],
    loginHistory: { type: Schema.Types.ObjectId, ref: "User" },
    tokenExpiresAt: { type: Date, required: false },
    commission: { type: Number, required: false, default: 1 },
    layersBetAllow: { type: Boolean, default: true },
    lastLoginIp: { type: String, maxLength: 191 },
    isCommission: { type: Boolean, default: false },
    isLayerCommission: { type: Boolean, default: false },
    accountNo: { type: String },
    WhitelabelB2CFirstTimeLogin: { type: Boolean, default: true, required: true },
    isBonus: { type: Boolean, default: true },
    twoFactorVerified: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: "123456", max: 6 },
    twoFactorRecoveryCodes: { type: [String] },
    twoFactorMethod: { type: String, enum: ["app", "sms", "google", "googleAuthenticator"] },
    twoFactorToken: { type: Object },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const googleAuthenticatorSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", maxLength: 100 },
    secret: { type: Object, required: false },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const generalSettingSchema = new Schema(
  {
    roleId: { type: Schema.Types.ObjectId, ref: "User", maxLength: 100 },
    bonus: { type: Number, default: 0 },
    bonusPercentage: { type: Number, default: 0 },
    bonusPercentageUpdatedDate: { type: Date, default: new Date() },
    bonusUpdatedDate: { type: Date, default: new Date() },
    cryptoPaymentLimit: { type: Number, default: 1000, min: 0 },
    cryptoPaymentLimitCurrency: { type: Schema.Types.ObjectId, ref: "Currency" },
    cryptoPaymentLimitUpdatedDate: { type: Date, default: new Date() },
    isLadder: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const settingSchema = new Schema(
  {
    sportsId: { type: Schema.Types.ObjectId, ref: "Sports" },
    currencyId: { type: Schema.Types.ObjectId, ref: "Currency" },
    whiteLabelId: { type: Schema.Types.ObjectId, ref: "WhiteLabel" },
    stakeSize: [{ type: Object }],
    commission: [{ type: Object }],
    betDelay: [{ type: Object }],
    betfairPercentage: { type: Number },
    bookmakerLimit: { type: Number, default: 100000 },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const leagueSettingSchema = new Schema(
  {
    sportId: { type: Schema.Types.ObjectId, ref: "Sports" },
    leagueId: { type: Schema.Types.ObjectId, ref: "League" },
    whiteLabelId: { type: Schema.Types.ObjectId, ref: "WhiteLabel" },
    currencyId: { type: Schema.Types.ObjectId, ref: "Currency" },
    betfairPercentage: { type: Number },
    bookmakerLimit: { type: Number, default: 1000000 },
    stakeSize: [{ type: Object }],
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const venueSettingSchema = new Schema(
  {
    sportId: { type: Schema.Types.ObjectId, ref: "Sports" },
    venueId: { type: Schema.Types.ObjectId, ref: "Venue" },
    whiteLabelId: { type: Schema.Types.ObjectId, ref: "WhiteLabel" },
    currencyId: { type: Schema.Types.ObjectId, ref: "Currency" },
    betfairPercentage: { type: Number },
    bookmakerLimit: { type: Number, default: 1000000 },
    stakeSize: [{ type: Object }],
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const matchSettingSchema = new Schema(
  {
    sportId: { type: Schema.Types.ObjectId, ref: "Sports" },
    leagueId: { type: Schema.Types.ObjectId, ref: "League" },
    whiteLabelId: { type: Schema.Types.ObjectId, ref: "WhiteLabel" },
    eventId: { type: Schema.Types.ObjectId, ref: "Event" },
    currencyId: { type: Schema.Types.ObjectId, ref: "Currency" },
    stakeSize: [{ type: Object }],
    betfairPercentage: {
      exchange: { type: Number },
      line: { type: Number },
    },
    bookmakerLimit: { type: Number, default: 1000000 },
    status: { type: String, default: "1", enum: ["0", "1"] },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const runnerMetaDataSchema = new Schema(
  {
    sire_name: String,
    cloth_number_alpha: String,
    official_rating: Number,
    colours_description: String,
    colours_filename: String,
    forecastprice_denominator: String,
    damsire_name: String,
    weight_value: String,
    sex_type: String,
    days_since_last_run: String,
    wearing: String,
    owner_name: String,
    dam_year_born: String,
    sire_bred: String,
    jockey_name: String,
    dam_bred: String,
    adjusted_rating: Number,
    runner_id: String,
    cloth_number: String,
    sire_year_born: String,
    trainer_name: String,
    colour_type: String,
    age: String,
    damsire_bred: String,
    jockey_claim: String,
    form: String,
    forecastprice_numerator: String,
    bred: String,
    dam_name: String,
    damsire_year_born: String,
    stall_draw: String,
    weight_units: String,
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const runnerSchema = new Schema(
  {
    runnerName: { type: String, maxLength: 100 },
    selectionId: { type: String, maxLength: 100 },
    status: { type: String, default: "0", enum: ["0", "1", "2"] },
    sortPriority: { type: String },
    metadata: { type: Schema.Types.ObjectId, ref: "RunnerMetaData", maxLength: 100 },
  },
  { timestamps: true }
);

const marketSchema = new Schema(
  {
    marketName: { type: String, maxLength: 100 },
    slugName: { type: String, maxLength: 100 },
    marketId: { type: String, maxLength: 100 },
    bettingType: { type: String, maxLength: 100 },
    priority: { type: Boolean, default: false },
    selectionId: { type: String, maxLength: 100 },
    type: { type: String, maxLength: 15 },
    status: { type: String, default: "0", enum: ["0", "1", "2"], maxLength: 3 },
    marketStartTime: { type: String, maxLength: 100 },
    runners: [
      {
        type: Schema.Types.ObjectId,
        ref: "Runner",
      },
    ],
    oddLimit: { type: Number, maxLength: 100 },
    eventId: { type: Schema.Types.ObjectId, ref: "Event" },
  },
  { timestamps: true }
);

const marketSettledSchema = new Schema(
  {
    marketName: { type: String, maxLength: 100 },
    slugName: { type: String, maxLength: 100 },
    marketId: { type: String, maxLength: 100 },
    bettingType: { type: String, maxLength: 100 },
    priority: { type: Boolean, default: false },
    selectionId: { type: String, maxLength: 100 },
    type: { type: String, maxLength: 15 },
    status: { type: String, default: "0", enum: ["0", "1", "2"], maxLength: 3 },
    marketStartTime: { type: String, maxLength: 100 },
    marketClosedTime: { type: Date },
    protected: { type: Boolean, default: false },
    runners: [
      {
        type: Schema.Types.ObjectId,
        ref: "Runner",
      },
    ],
    oddLimit: { type: Number, maxLength: 100 },
  },
  { timestamps: true }
);

const venueSchema = new Schema(
  {
    name: { type: String, maxLength: 100 },
    slugName: { type: String, maxLength: 100 },
    status: { type: String, default: "1", enum: ["0", "1", "2"] },
    events: [
      {
        type: Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
    countryId: { type: Schema.Types.ObjectId, ref: "Country" },
    sportId: { type: Schema.Types.ObjectId, ref: "Sports", maxLength: 100, required: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const countrySchema = new Schema(
  {
    name: { type: String, maxLength: 100 },
    countryCode: { type: String, maxLength: 100 },
    status: { type: String, default: "1", enum: ["0", "1", "2"] },
    Venues: [
      {
        type: Schema.Types.ObjectId,
        ref: "Venue",
      },
    ],
    sportId: { type: Schema.Types.ObjectId, ref: "Sports", maxLength: 100, required: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const eventSchema = new Schema(
  {
    sportId: { type: Schema.Types.ObjectId, ref: "Sports", maxLength: 100 },
    leagueId: { type: Schema.Types.ObjectId, ref: "League", maxLength: 100 },
    venueId: { type: Schema.Types.ObjectId, ref: "Venue", maxLength: 100 },
    name: { type: String, maxLength: 100 },
    id: { type: String, maxLength: 100, unique: true },
    date: { type: String },
    channelCode: { type: String, maxLength: 100 },
    raderId: { type: String, maxLength: 100 },
    status: { type: String, default: "0", enum: ["0", "1", "2", "3"], maxLength: 3 },
    markets: [
      {
        type: Schema.Types.ObjectId,
        ref: "Market",
      },
    ],
    settings: [
      {
        type: Schema.Types.ObjectId,
        ref: "EventSetting",
      },
    ],
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const leagueSchema = new Schema(
  {
    sportId: { type: Schema.Types.ObjectId, ref: "Sports", maxLength: 100 },
    name: { type: String, maxLength: 100 },
    slugName: { type: String, maxLength: 100 },
    leagueCode: { type: String, maxLength: 100 },
    status: { type: String, default: "0", enum: ["0", "1", "2"] },
    events: [
      {
        type: Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
    settings: [
      {
        type: Schema.Types.ObjectId,
        ref: "LeagueSetting",
      },
    ],
    homeView: {
      status: { type: Boolean },
      priority: { type: Number },
    },
  },
  { timestamps: true }
);

const sportSchema = new Schema(
  {
    name: { type: String, maxLength: 100 },
    slugName: { type: String, maxLength: 100 },
    eventsCount: { type: Number },
    sportsCode: { type: String, maxLength: 100 },
    status: { type: String, default: "0", enum: ["0", "1", "2"], maxLength: 3 },
    leagues: [
      {
        type: Schema.Types.ObjectId,
        ref: "League",
      },
    ],
    countries: [
      {
        type: Schema.Types.ObjectId,
        ref: "Country",
      },
    ],
    settings: [
      {
        type: Schema.Types.ObjectId,
        ref: "Setting",
      },
    ],
    homeView: {
      status: { type: Boolean },
      priority: { type: Number },
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const fancyStakeLimitSchema = new Schema(
  {
    currencyId: { type: Schema.Types.ObjectId, ref: "Currency" },
    overFancy: {
      id: { type: Number, default: 10 },
      name: { type: String, default: "over" },
      fancyLimit: { type: Number, default: 1000000 },
    },
    overFancyMatch: {
      id: { type: Number, default: 10 },
      name: { type: String, default: "over" },
      fancyLimit: { type: Number, default: 100000 },
    },
    lambiFancy: {
      id: { type: Number, default: 12 },
      name: { type: String, default: "lambi" },
      fancyLimit: { type: Number, default: 1000000 },
    },
    lambiFancyMatch: {
      id: { type: Number, default: 12 },
      name: { type: String, default: "lambiMatch" },
      fancyLimit: { type: Number, default: 100000 },
    },
    firstWicket: {
      id: { type: Number, default: 14 },
      name: { type: String, default: "firstWicket" },
      fancyLimit: { type: Number, default: 1000000 },
    },
    firstWicketMatch: {
      id: { type: Number, default: 14 },
      name: { type: String, default: "firstWicketMatch" },
      fancyLimit: { type: Number, default: 100000 },
    },
    firstGroupedWickets: {
      id: { type: Number, default: 16 },
      name: { type: String, default: "firstGroupedWickets" },
      fancyLimit: { type: Number, default: 1000000 },
    },
    firstGroupedWicketsMatch: {
      id: { type: Number, default: 16 },
      name: { type: String, default: "firstGroupedWicketsMatch" },
      fancyLimit: { type: Number, default: 100000 },
    },
    playersBased: {
      id: { type: Number, default: 18 },
      name: { type: String, default: "playersBased" },
      fancyLimit: { type: Number, default: 1000000 },
    },
    playersBasedMatch: {
      id: { type: Number, default: 18 },
      name: { type: String, default: "playersBasedMatch" },
      fancyLimit: { type: Number, default: 1000000 },
    },
    playersBoundaries: {
      id: { type: Number, default: 20 },
      name: { type: String, default: "playersboundaries" },
      fancyLimit: { type: Number, default: 1000000 },
    },
    playersBoundariesMatch: {
      id: { type: Number, default: 20 },
      name: { type: String, default: "playersboundariesMatch" },
      fancyLimit: { type: Number, default: 100000 },
    },
    playersTotalBallFaced: {
      id: { type: Number, default: 22 },
      name: { type: String, default: "playerstotalballFaced" },
      fancyLimit: { type: Number, default: 1000000 },
    },
    playersTotalBallFacedMatch: {
      id: { type: Number, default: 22 },
      name: { type: String, default: "playerstotalballFacedMatch" },
      fancyLimit: { type: Number, default: 100000 },
    },
    overBasedRuns: {
      id: { type: Number, default: 28 },
      name: { type: String, default: "overbasedruns" },
      fancyLimit: { type: Number, default: 1000000 },
    },
    overBasedRunsMatch: {
      id: { type: Number, default: 28 },
      name: { type: String, default: "overbasedrunsMatch" },
      fancyLimit: { type: Number, default: 100000 },
    },
    runBased: {
      id: { type: Number, default: 34 },
      name: { type: String, default: "runBasedOverRun" },
      fancyLimit: { type: Number, default: 1000000 },
    },
    runBasedMatch: {
      id: { type: Number, default: 34 },
      name: { type: String, default: "runBasedOverRunMatch" },
      fancyLimit: { type: Number, default: 100000 },
    },
    firstWicketBalls: {
      id: { type: Number, default: 36 },
      name: { type: String, default: "firstWicketBalls" },
      fancyLimit: { type: Number, default: 1000000 },
    },
    firstWicketBallsMatch: {
      id: { type: Number, default: 36 },
      name: { type: String, default: "firstWicketBallsMatch" },
      fancyLimit: { type: Number, default: 1000000 },
    },
    firstWicketBoundaries: {
      id: { type: Number, default: 42 },
      name: { type: String, default: "firstWicketBoundaries" },
      fancyLimit: { type: Number, default: 1000000 },
    },
    firstWicketBoundariesMatch: {
      id: { type: Number, default: 42 },
      name: { type: String, default: "firstWicketBoundariesMatch" },
      fancyLimit: { type: Number, default: 100000 },
    },
    DefaultStakes: {
      id: { type: Number, default: 0 },
      name: { type: String, default: "defaultstake" },
      fancyLimit: { type: Number, default: 1000000 },
    },
    DefaultStakesMatch: {
      id: { type: Number, default: 0 },
      name: { type: String, default: "defaultstakeMatch" },
      fancyLimit: { type: Number, default: 100000 },
    },
    leagueId: { type: Schema.Types.ObjectId, ref: "League" },
    isLeagueOnly: Boolean,
    sportsId: { type: Schema.Types.ObjectId, ref: "Sport" },
    matchOnly: { type: Schema.Types.ObjectId, ref: "events" },
    isMatchOnly: Boolean,
    default: Boolean,
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const commissionSettingSchema = new Schema(
  {
    MATCH_ODDS: { type: Number, required: true, default: 0, min: 0, max: 100 },
    BOOKMAKER: { type: Number, required: true, default: 0, min: 0, max: 100 },
    FANCY: { type: Number, required: true, default: 0, min: 0, max: 100 },
    TENNIS: { type: Number, required: true, default: 0, min: 0, max: 100 },
    LINE: { type: Number, required: true, default: 0, min: 0, max: 100 },
  },
  { timestamps: true, collection: "commisson settings" }
);

const auditSchema = new Schema(
  {
    settlementRollbackDeclaredBy: {
      rollbackBy: { type: Schema.Types.ObjectId, ref: "User" },
      rollbackUser: { type: Schema.Types.ObjectId, ref: "User" },
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const transactionSchema = new Schema(
  {
    fromId: { type: Schema.Types.ObjectId, ref: "User", maxLength: 100 },
    toId: { type: Schema.Types.ObjectId, ref: "User", maxLength: 100 },
    transaction_type: {
      type: String,
      enum: ["deposit", "withdrawl", "settlement", "moneyPlant_Deposit", "moneyPlant_Withdraw"],
    },
    orderId: { type: String },
    description: { type: String },
    amount: { type: Number },
    fromAmount: { type: Number, default: 0 },
    toAmount: { type: Number, default: 0 },
    currency: { type: Object },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const currencySchema = new Schema(
  {
    name: { type: String, maxLength: 100 },
    code: { type: String, maxLength: 100 },
    value: { type: String, maxLength: 100 },
    betFair: { type: Boolean, default: false },
    selected: { type: Boolean },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// Models
export const GeneralSetting = mongoose.models.GeneralSetting || model("GeneralSetting", generalSettingSchema);
export const UserLoginHistory = mongoose.models.UserLoginHistory || model("UserLoginHistory", loginHistorySchema);
export const User = mongoose.models.User || model("User", userSchema);
export const SportBet = mongoose.models.SportBets || model("SportBets", sportBetsSchema);
export const SportSettleBet = mongoose.models.SportSettleBets || model("SportSettleBets", sportSettleBetsSchema);
export const CasinoBet = mongoose.models.CasinoBets || model("CasinoBets", casinoBetsSchema);
export const GapCasinoTransaction = mongoose.models.GapCasinoTransaction || model("GapCasinoTransaction", gapCasinoTransactionSchema);
export const GapCasinoGame = mongoose.models.GapCasinoSchema || model("GapCasinoSchema", gapCasinoSchema);
export const ChipSetting = mongoose.models.ChipSetting || model("ChipSetting", chipSchema);
export const Exposure = mongoose.models.Exposure || model("Exposure", exposureSchema);
export const BankAccount = mongoose.models.BankAccount || model("BankAccount", bankAccountSchema);
export const Deposit = mongoose.models.Deposit || model("Deposit", depositSchema);
export const Withdrawal = mongoose.models.Withdrawal || model("Withdrawal", withdrawalSchema);
export const GoogleAuthenticator = mongoose.models.GoogleAuthenticator || model("GoogleAuthenticator", googleAuthenticatorSchema);
export const ResultTransaction = mongoose.models.ResultTransaction || model("ResultTransaction", resultTransactionSchema);

export const Setting = mongoose.models.Setting || model("Setting", settingSchema);
export const LeagueSetting = mongoose.models.LeagueSetting || model("LeagueSetting", leagueSettingSchema);
export const VenueSetting = mongoose.models.VenueSetting || model("VenueSetting", venueSettingSchema);
export const MatchSetting = mongoose.models.MatchSetting || model("MatchSetting", matchSettingSchema);
export const Runner = mongoose.models.Runner || model("Runner", runnerSchema);
export const Market = mongoose.models.Market || model("Market", marketSchema);
export const MarketSettled = mongoose.models.MarketSettled || model("MarketSettled", marketSettledSchema);
export const Event = mongoose.models.Event || model("Event", eventSchema);
export const League = mongoose.models.League || model("League", leagueSchema);
export const Sport = mongoose.models.Sports || model("Sports", sportSchema);
export const Country = mongoose.models.Country || model("Country", countrySchema);
export const Venue = mongoose.models.Venue || model("Venue", venueSchema);
export const RunnerMetaData = mongoose.models.RunnerMetaData || model("RunnerMetaData", runnerMetaDataSchema);
export const FancyStake = mongoose.models.FancyStake || model("FancyStake", fancyStakeLimitSchema);
export const CommissionSetting = mongoose.models.CommissionSetting || model("CommissionSetting", commissionSettingSchema);

export const Audit = mongoose.models.Audit || model("Audit", auditSchema);
export const Transaction = mongoose.models.Transaction || model("Transaction", transactionSchema);
export const Currency = mongoose.models.Currency || model("Currency", currencySchema);