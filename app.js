/**
 * CommonGround — Eco-Village & Homestead OS
 * Unified, highly innovative state engine with persistent localStorage hooks.
 */

// --- INITIAL DEFAULT DATABASE SEEDS ---
const INITIAL_CROPS = [
  { id: "crop-1", name: "Heirloom Tomatoes", variety: "Roma Organic", icon: "🍅", plantedDate: "2026-04-10", daysToHarvest: 75, lastWatered: "2026-05-23T18:00:00Z", notes: "Raised Bed A.", qtyPlanted: 15, estimatedYieldPerQty: 8 },
  { id: "crop-2", name: "Hardneck Garlic", variety: "Music Hardneck", icon: "🧅", plantedDate: "2025-10-15", daysToHarvest: 240, lastWatered: "2026-05-22T09:00:00Z", notes: "Mulched heavily with straw.", qtyPlanted: 100, estimatedYieldPerQty: 0.2 },
  { id: "crop-3", name: "Rainbow Carrots", variety: "Danvers Blend", icon: "🥕", plantedDate: "2026-05-01", daysToHarvest: 65, lastWatered: "2026-05-24T06:00:00Z", notes: "Sown in fine compost.", qtyPlanted: 200, estimatedYieldPerQty: 0.15 },
  { id: "crop-4", name: "Strawberries", variety: "Everlasting Sweet", icon: "🍓", plantedDate: "2026-04-20", daysToHarvest: 45, lastWatered: "2026-05-23T17:30:00Z", notes: "Crown runners trimmed.", qtyPlanted: 25, estimatedYieldPerQty: 2 },
  { id: "crop-5", name: "Savoy Spinach", variety: "Bloomsdale Savoy", icon: "🥬", plantedDate: "2026-04-25", daysToHarvest: 40, lastWatered: "2026-05-24T06:15:00Z", notes: "Added mesh sun shaders.", qtyPlanted: 60, estimatedYieldPerQty: 0.5 }
];

const INITIAL_TASKS = [
  { id: "task-1", title: "Feed heritage laying hens and collect morning eggs", category: "animals", priority: "high", status: "done", assignee: "Bekah", hours: 1.0 },
  { id: "task-2", title: "Refill automatic waters in sheep paddock", category: "animals", priority: "high", status: "todo", assignee: "Lucas", hours: 1.5 },
  { id: "task-3", title: "Weed and thin the new carrot and beet beds", category: "gardening", priority: "medium", status: "doing", assignee: "Bekah", hours: 2.0 },
  { id: "task-4", title: "Repair greenhouse ventilation automatic opener cylinder", category: "building", priority: "high", status: "todo", assignee: "Dave", hours: 3.5 },
  { id: "task-5", title: "Build compost heap tier 3 and turn tier 1 pile", category: "gardening", priority: "low", status: "todo", assignee: "Sarah", hours: 3.0 },
  { id: "task-6", title: "Sow sweet pea seeds along trellis wires", category: "gardening", priority: "low", status: "done", assignee: "Sarah", hours: 1.0 }
];

const INITIAL_ACTIVITIES = [
  { id: "act-1", text: "Bekah watered the Rainbow Carrots", time: "0.2 hours ago", type: "crop", icon: "🥕" },
  { id: "act-2", text: "Bekah completed: Feed heritage laying hens and collect morning eggs", time: "1 hour ago", type: "task", icon: "🐔" },
  { id: "act-3", text: "Dave checked out the Aerator from the tool library", time: "3 hours ago", type: "system", icon: "⚙️" },
  { id: "act-4", text: "Sarah completed: Sow sweet pea seeds along trellis wires", time: "Yesterday", type: "task", icon: "🌱" }
];

const INITIAL_STORE = [
  { id: "prod-1", name: "Farm Fresh Eggs (Doz)", price: 7.00, stock: 18, emoji: "🥚", unit: "dozen" },
  { id: "prod-2", name: "Raw Wildflower Honey", price: 12.00, stock: 8, emoji: "🍯", unit: "jar" },
  { id: "prod-3", name: "Artisan Sourdough Boule", price: 9.00, stock: 5, emoji: "🍞", unit: "loaf" },
  { id: "prod-4", name: "Organic Salad Greens", price: 5.00, stock: 15, emoji: "🥬", unit: "bag" },
  { id: "prod-5", name: "Pure Maple Syrup", price: 16.00, stock: 6, emoji: "🍁", unit: "bottle" },
  { id: "prod-6", name: "Heirloom Garlic Bulb Pack", price: 8.00, stock: 12, emoji: "🧅", unit: "4-pack" }
];

const INITIAL_TOOLS = [
  { id: "tool-1", name: "John Deere Utility Tractor", emoji: "🚜", hourlyRate: 45.00, status: "available", renter: "", checkoutTime: null, durationHours: 0, cumulativeEarnings: 1620.00, totalHoursUsed: 36 },
  { id: "tool-2", name: "Heavy Duty Rototiller", emoji: "⚙️", hourlyRate: 15.00, status: "available", renter: "", checkoutTime: null, durationHours: 0, cumulativeEarnings: 360.00, totalHoursUsed: 24 },
  { id: "tool-3", name: "Commercial Wood Chipper", emoji: "🪵", hourlyRate: 25.00, status: "rented", renter: "Oak Creek Homestead", checkoutTime: "2026-05-24T02:00:00.000Z", durationHours: 6, cumulativeEarnings: 650.00, totalHoursUsed: 26 },
  { id: "tool-4", name: "25-Ton Hydraulic Log Splitter", emoji: "🪓", hourlyRate: 20.00, status: "available", renter: "", checkoutTime: null, durationHours: 0, cumulativeEarnings: 480.00, totalHoursUsed: 24 },
  { id: "tool-5", name: "Tow-Behind Lawn Aerator", emoji: "🚜", hourlyRate: 12.00, status: "maintenance", renter: "", checkoutTime: null, durationHours: 0, cumulativeEarnings: 180.00, totalHoursUsed: 15 }
];

const INITIAL_TRANSACTIONS = [
  { id: "tx-1", date: "2026-05-24", desc: "Co-op Monthly CSA Renewals (10 shares)", category: "CSA Subscription", type: "income", amount: 1200.00 },
  { id: "tx-2", date: "2026-05-23", desc: "Sold 6 Dozen Eggs & 2 Sourdough Boules", category: "Storefront", type: "income", amount: 60.00 },
  { id: "tx-3", date: "2026-05-22", desc: "Tractor checkout - 4 hrs (Cedar Ridge Farm)", category: "Tool Library", type: "income", amount: 180.00 },
  { id: "tx-4", date: "2026-05-20", desc: "Purchase Organic Seed stock & compost bags", category: "Farm Ops", type: "expense", amount: 145.00 },
  { id: "tx-5", date: "2026-05-18", desc: "Chicken layer organic feed supply (4 bags)", category: "Livestock", type: "expense", amount: 110.00 },
  { id: "tx-6", date: "2026-05-15", desc: "Rototiller checkout - 8 hrs (Sarah Jenkins)", category: "Tool Library", type: "income", amount: 120.00 },
  { id: "tx-7", date: "2026-05-10", desc: "Greenhouse propane heating tank refill", category: "Utilities", type: "expense", amount: 85.00 }
];

const DEFAULT_PAYROLL = { Bekah: 120.00, Lucas: 45.00, Dave: 85.00, Sarah: 60.00 };
const DEFAULT_LIVESTOCK = [
  { id: "live-flock-1", name: "Rhode Island Red Hens", emoji: "🐔", type: "layers", qty: 15, health: "Excellent", eggYieldLifetime: 540, feedLevel: 88, feedSupplyLbs: 100 },
  { id: "live-herd-2", name: "Alpine Dairy Goats", emoji: "🐐", type: "dairy", qty: 3, health: "Perfect", milkYieldLifetime: 220, feedLevel: 75, feedSupplyLbs: 150 },
  { id: "live-guard-3", name: "Blue (Guardian Collie)", emoji: "🐶", type: "guard", qty: 1, health: "Excellent", patrolSector: "South Pasture", feedLevel: 95, feedSupplyLbs: 40 }
];
const DEFAULT_EVENTS = [
  { id: "evt-1", month: "MAY", day: "30", title: "Spring Potato Planting Day", details: "Volunteers sow seed potato beds. Community stew dinner provided.", hours: 4, rsvps: 5, slots: 8 },
  { id: "evt-2", month: "JUN", day: "05", title: "Communal Chicken Coop Insulation", details: "Winterizing laying henhouse, laying cedar shingles, cleaning coop.", hours: 6, rsvps: 2, slots: 5 },
  { id: "evt-3", month: "JUN", day: "20", title: "Co-op Summer Solstice Harvest Feast", details: "Communal solstice celebration, sharing fresh potluck yields.", hours: 2, rsvps: 12, slots: 25 }
];
const DEFAULT_SEEDS = [
  { id: "seed-1", name: "Cherokee Purple Tomato", emoji: "🍅", category: "Veg", packets: 8, checkedOut: 2 },
  { id: "seed-2", name: "Scarlet Runner Bean", emoji: "🌱", category: "Veg", packets: 15, checkedOut: 5 },
  { id: "seed-3", name: "Mammoth Leafy Dill", emoji: "🌿", category: "Herb", packets: 6, checkedOut: 1 },
  { id: "seed-4", name: "French Breakfast Radish", emoji: "🥕", category: "Veg", packets: 12, checkedOut: 4 }
];
const DEFAULT_BARTERS = [
  { id: "barter-1", member: "Dave", offer: "Small engine/tractor routine tuning", seek: "Fresh wildflower honey jars or sourdough boules" },
  { id: "barter-2", member: "Sarah", offer: "Sourdough starters & baking workshops", seek: "Seed potatoes or sweet onion bulb slips" },
  { id: "barter-3", member: "Lucas", offer: "Greenhouse irrigation drip installation", seek: "Fresh chicken egg baskets" }
];
const DEFAULT_PLOTS = [
  { id: "plot-1", label: "Bed A1", reserved: true },
  { id: "plot-2", label: "Bed A2", reserved: false },
  { id: "plot-3", label: "Bed B1", reserved: true },
  { id: "plot-4", label: "Bed B2", reserved: false },
  { id: "plot-5", label: "Bed C1", reserved: false },
  { id: "plot-6", label: "Bed C2", reserved: false },
  { id: "plot-7", label: "Bed D1", reserved: true },
  { id: "plot-8", label: "Bed D2", reserved: false },
  { id: "plot-9", label: "Bed E1", reserved: false },
  { id: "plot-10", label: "Bed E2", reserved: false },
  { id: "plot-11", label: "Bed F1", reserved: false },
  { id: "plot-12", label: "Bed F2", reserved: false }
];

// --- AI PLANT VISION DIAGNOSIS DATABASE ---
const DIAGNOSIS_DATABASE = {
  early_blight: {
    name: "Tomato Early Blight",
    classification: "Fungal Pathogen (Alternaria solani)",
    confidence: "98.4%",
    description: "A highly destructive fungal blight characterized by circular brown spots with concentric ring patterns (resembling targets) appearing first on older leaves.",
    symptoms: [
      "Dark concentric target-like rings on mature leaves",
      "Yellow halos developing around leaf spots",
      "Premature leaf drop leading to exposed fruit sunscald",
      "Stems developing dark, sunken cankers near soil line"
    ],
    remedy: "Prune infected lower foliage immediately to increase soil airflow. Spray weekly with an organic copper fungicide or baking soda-compost tea mixture. Layer deep straw mulch beneath tomato beds to prevent soil spores splashing onto leaves.",
    remedyChore: "Prune affected tomato foliage & apply organic copper-compost tea spray",
    remedyCategory: "gardening",
    remedyHours: 2.0,
    seeds: ["seed-1", "seed-3"], // Cherokee Purple Tomato, Dill (companions)
    indicatorStyle: "radial-gradient(circle, #5a4b15 20%, #2f6f32 60%)"
  },
  powdery_mildew: {
    name: "Squash Powdery Mildew",
    classification: "Fungal Mildew (Erysiphaceae)",
    confidence: "97.2%",
    description: "A common fungal infection coating the surface of squash, melon, and cucumber foliage in white powdery residue, inhibiting photosynthesis.",
    symptoms: [
      "Talcum-powder-like white mycelium spots on upper leaf surfaces",
      "Leaves yellowing, curling upwards, and drying out",
      "Stunted growth of squash blossoms and mature yields"
    ],
    remedy: "Drip-irrigate beds instead of overhead watering. Spray leaf surfaces with a 1:9 milk-to-water dilution under bright sunlight (milk enzymes act as organic disinfectants). Crop rotate with non-cucurbit crops next season.",
    remedyChore: "Mix milk-water organic solution and spray squash powdery mildew",
    remedyCategory: "gardening",
    remedyHours: 1.5,
    seeds: ["seed-2", "seed-4"], // Beans, Radishes (companions)
    indicatorStyle: "radial-gradient(circle, #dedede 25%, #2f6f32 70%)"
  },
  apple_rust: {
    name: "Cedar Apple Rust",
    classification: "Gymnosporangium juniperi-virginianae",
    confidence: "96.5%",
    description: "A dual-host rust fungus that alternates its life cycle between Eastern Red Cedars (juniper) and Apple orchards, creating bright orange spotting.",
    symptoms: [
      "Bright, visual yellow-orange spot circles on apple leaf surfaces",
      "Minute tube-like rust spores emerging beneath apple leaves",
      "Premature defoliation of apple orchards"
    ],
    remedy: "Remove or prune wild juniper trees within a 100-yard orchard radius. Apply organic sulfur spray immediately upon blossom bud break. Plant rust-resistant cultivars in future orchard expansions.",
    remedyChore: "Clear nearby wild cedar brush and apply organic sulfur apple spray",
    remedyCategory: "gardening",
    remedyHours: 3.0,
    seeds: ["seed-3"], // Dill (companion)
    indicatorStyle: "radial-gradient(circle, #e65c00 25%, #2f6f32 75%)"
  },
  iron_chlorosis: {
    name: "Iron Chlorosis Deficiency",
    classification: "Nutritional/Soil Alkaline Stress",
    confidence: "94.8%",
    description: "Yellowing of foliage caused by the plant's inability to absorb iron from highly alkaline or waterlogged soils. Veins remain dark green.",
    symptoms: [
      "Interveinal chlorosis (yellow leaves with distinct dark green veins)",
      "Brittle, white leaf edges in advanced stages",
      "Stunted shrub growth and failure to set berries"
    ],
    remedy: "Incorporate elemental sulfur or organic pine needle mulch to lower soil pH below 5.5. Apply chelated iron foliar sprays directly to affected leaves for quick rescue.",
    remedyChore: "Incorporate organic pine needles to lower pH & apply foliar iron spray",
    remedyCategory: "gardening",
    remedyHours: 2.5,
    seeds: ["seed-4"], // Radish (companion cover)
    indicatorStyle: "radial-gradient(circle, #d4d428 30%, #155518 80%)"
  },
  cabbage_looper: {
    name: "Cabbage Looper Infestation",
    classification: "Insect Pest (Trichoplusia ni)",
    confidence: "98.9%",
    description: "A smooth green caterpillar insect larva that crawls like an inchworm, rapidly consuming leafy greens and brassicas.",
    symptoms: [
      "Large, irregular chewing holes inside kale and cabbage foliage",
      "Dark green frass fecal pellets left on leaf joints",
      "Visual presence of light-green loopers looping on leaf undersides"
    ],
    remedy: "Spray with organic Bacillus thuringiensis (Bt), a soil bacterium safe for bees but lethal to caterpillars. Deploy fine insect netting mesh over brassica rows to block egg-laying moths. Release beneficial native lacewings.",
    remedyChore: "Spray organic Bt treatment on kale beds & install protection insect netting",
    remedyCategory: "animals",
    remedyHours: 2.0,
    seeds: ["seed-1", "seed-2"], // Tomato, Beans (companions)
    indicatorStyle: "radial-gradient(circle, #1a3c1c 20%, #442a0b 70%)"
  }
};

// --- APP STATE SYSTEM ---
class CommonGroundApp {
  constructor() {
    this.crops = JSON.parse(localStorage.getItem("cg_crops")) || INITIAL_CROPS;
    this.tasks = JSON.parse(localStorage.getItem("cg_tasks")) || INITIAL_TASKS;
    this.activities = JSON.parse(localStorage.getItem("cg_activities")) || INITIAL_ACTIVITIES;
    this.storeProducts = JSON.parse(localStorage.getItem("cg_store")) || INITIAL_STORE;
    this.tools = JSON.parse(localStorage.getItem("cg_tools")) || INITIAL_TOOLS;
    this.transactions = JSON.parse(localStorage.getItem("cg_transactions")) || INITIAL_TRANSACTIONS;
    
    this.memberBalances = JSON.parse(localStorage.getItem("cg_payroll")) || DEFAULT_PAYROLL;
    this.livestock = JSON.parse(localStorage.getItem("cg_livestock")) || DEFAULT_LIVESTOCK;
    this.events = JSON.parse(localStorage.getItem("cg_events")) || DEFAULT_EVENTS;
    this.seeds = JSON.parse(localStorage.getItem("cg_seeds")) || DEFAULT_SEEDS;
    this.barters = JSON.parse(localStorage.getItem("cg_barters")) || DEFAULT_BARTERS;
    this.plots = JSON.parse(localStorage.getItem("cg_plots")) || DEFAULT_PLOTS;
    this.cisternWater = parseInt(localStorage.getItem("cg_water")) || 8500;
    this.solarBattery = parseInt(localStorage.getItem("cg_solar")) || 72;

    // Rotational Grazing paddock state
    const DEFAULT_PADDOCKS = [
      { id: "a", name: "North Paddock (A)", height: 3, status: "grazing", restDays: 0, cap: 12 },
      { id: "b", name: "Clover Field (B)", height: 6, status: "recovering", restDays: 18, cap: 28 },
      { id: "c", name: "High Forest Run (C)", height: 12, status: "ready", restDays: 30, cap: 45 }
    ];
    this.paddocks = JSON.parse(localStorage.getItem("cg_paddocks")) || DEFAULT_PADDOCKS;

    // A11y & Pricing Tier state loads
    this.focusModeActive = JSON.parse(localStorage.getItem("cg_focus_mode")) || false;
    this.pricingTier = localStorage.getItem("cg_pricing_tier") || "pro"; // pro or basic
    this.addonStorefront = localStorage.getItem("cg_addon_storefront") === "true";
    this.addonIot = localStorage.getItem("cg_addon_iot") === "true";

    // USDA Hardiness Zone & Cottage Food legal disclaimers
    this.usdaZone = parseInt(localStorage.getItem("cg_usda_zone")) || 7;
    // Free-text field, NOW supplementary — the state-required disclaimer is
    // generated automatically by cottageFoodValidator.js from regionStateCode.
    this.cottageFoodStatement = localStorage.getItem("cg_cottage_food") || "";
    this.regionStateCode = (localStorage.getItem("cg_state_code") || "").toUpperCase();
    this.loraPacketsCount = parseInt(localStorage.getItem("cg_lora_packets")) || 14242;
    this.compostQueue = JSON.parse(localStorage.getItem("cg_compost_queue")) || [];

    this.cart = {}; 
    this.csaShares = 10;
    this.csaRatePerShare = 120.00;
    this.csaPromisedWeeklyLbs = 8;
    this.laborRatePerHour = 15.00;
    this.currentDate = new Date("2026-05-24T06:22:00.000Z");
    this.activeVoiceLiveId = null;
    this.speechRecognizer = null;
    this.isListening = false;
    
    this.initDOM();
    this.initEventListeners();
    this.activateUtilityPulse();
    this.initAccessibilityState();
    
    this.render();
  }

  saveToStorage() {
    localStorage.setItem("cg_crops", JSON.stringify(this.crops));
    localStorage.setItem("cg_tasks", JSON.stringify(this.tasks));
    localStorage.setItem("cg_activities", JSON.stringify(this.activities));
    localStorage.setItem("cg_store", JSON.stringify(this.storeProducts));
    localStorage.setItem("cg_tools", JSON.stringify(this.tools));
    localStorage.setItem("cg_transactions", JSON.stringify(this.transactions));
    localStorage.setItem("cg_payroll", JSON.stringify(this.memberBalances));
    localStorage.setItem("cg_livestock", JSON.stringify(this.livestock));
    localStorage.setItem("cg_events", JSON.stringify(this.events));
    localStorage.setItem("cg_seeds", JSON.stringify(this.seeds));
    localStorage.setItem("cg_barters", JSON.stringify(this.barters));
    localStorage.setItem("cg_plots", JSON.stringify(this.plots));
    localStorage.setItem("cg_paddocks", JSON.stringify(this.paddocks));
    localStorage.setItem("cg_water", this.cisternWater.toString());
    localStorage.setItem("cg_solar", this.solarBattery.toString());
    
    // Save new a11y, tier, USDA and disclaimers states
    localStorage.setItem("cg_focus_mode", this.focusModeActive.toString());
    localStorage.setItem("cg_pricing_tier", this.pricingTier);
    localStorage.setItem("cg_addon_storefront", this.addonStorefront.toString());
    localStorage.setItem("cg_addon_iot", this.addonIot.toString());
    localStorage.setItem("cg_usda_zone", this.usdaZone.toString());
    localStorage.setItem("cg_cottage_food", this.cottageFoodStatement);
    localStorage.setItem("cg_state_code", this.regionStateCode);
    localStorage.setItem("cg_lora_packets", this.loraPacketsCount.toString());
  }

  // --- CACHE DOM ---
  initDOM() {
    this.navItems = document.querySelectorAll(".nav-menu .nav-item");
    this.tabContents = document.querySelectorAll(".tab-content");
    this.viewTitle = document.getElementById("view-title");
    this.viewSubtitle = document.getElementById("view-subtitle");
    this.liveDateSpan = document.getElementById("live-date");

    this.statActiveCrops = document.getElementById("stat-active-crops");
    this.statPendingTasks = document.getElementById("stat-pending-tasks");
    this.statToolsInUse = document.getElementById("stat-tools-in-use");
    this.statLedgerBalance = document.getElementById("stat-ledger-balance");
    this.activityFeedContainer = document.getElementById("activity-feed");
    this.urgentAlertsContainer = document.getElementById("urgent-alerts-container");

    this.cropsGrid = document.getElementById("crops-grid");
    this.cropSearch = document.getElementById("crop-search");
    this.btnAddCrop = document.getElementById("btn-add-crop");
    this.modalCrop = document.getElementById("modal-crop");
    this.closeCropModal = document.getElementById("close-crop-modal");
    this.btnCancelCrop = document.getElementById("btn-cancel-crop");
    this.formAddCrop = document.getElementById("form-add-crop");

    this.taskFilterCategory = document.getElementById("task-filter-category");
    this.taskFilterPriority = document.getElementById("task-filter-priority");
    this.btnAddTask = document.getElementById("btn-add-task");
    this.modalTask = document.getElementById("modal-task");
    this.closeTaskModal = document.getElementById("close-task-modal");
    this.btnCancelTask = document.getElementById("btn-cancel-task");
    this.formAddTask = document.getElementById("form-add-task");

    this.listTodo = document.getElementById("list-todo");
    this.listDoing = document.getElementById("list-doing");
    this.listDone = document.getElementById("list-done");

    this.countTodo = document.getElementById("count-todo");
    this.countDoing = document.getElementById("count-doing");
    this.countDone = document.getElementById("count-done");

    this.storeProductsGrid = document.getElementById("store-products-grid");
    this.cartItemsContainer = document.getElementById("cart-items-container");
    this.cartTotalVal = document.getElementById("cart-total-val");
    this.btnCheckoutCart = document.getElementById("btn-checkout-cart");
    this.checkoutPayor = document.getElementById("checkout-payor");

    this.csaSharesCount = document.getElementById("csa-shares-count");
    this.csaPromisedWeight = document.getElementById("csa-promised-weight");
    this.csaMatchingIndex = document.getElementById("csa-matching-index");
    this.csaMatchingBar = document.getElementById("csa-matching-bar");
    this.csaWarningContainer = document.getElementById("csa-warning-container");

    this.toolsGrid = document.getElementById("tools-grid");
    this.modalToolCheckout = document.getElementById("modal-tool-checkout");
    this.formToolCheckout = document.getElementById("form-tool-checkout");
    this.checkoutToolId = document.getElementById("checkout-tool-id");
    this.checkoutToolName = document.getElementById("checkout-tool-name");
    this.checkoutRenterInput = document.getElementById("checkout-renter");
    this.checkoutDurationInput = document.getElementById("checkout-duration");
    this.closeCheckoutModal = document.getElementById("close-checkout-modal");
    this.btnCancelCheckout = document.getElementById("btn-cancel-checkout");

    this.milestonePercentageVal = document.getElementById("milestone-percentage-val");
    this.milestoneProgressBar = document.getElementById("milestone-progress-bar");
    this.channelCsaVal = document.getElementById("channel-csa-val");
    this.channelStoreVal = document.getElementById("channel-store-val");
    this.channelToolsVal = document.getElementById("channel-tools-val");
    this.channelLeftVal = document.getElementById("channel-left-val");
    this.ledgerCashBalance = document.getElementById("ledger-cash-balance");
    this.ledgerSpecAssets = document.getElementById("ledger-spec-assets");
    
    this.memberPayrollLedger = document.getElementById("member-payroll-ledger");
    this.btnPayoutPayroll = document.getElementById("btn-payout-payroll");

    this.ledgerTransactionsBody = document.getElementById("ledger-transactions-body");
    this.ledgerFilterType = document.getElementById("ledger-filter-type");
    this.ledgerSearch = document.getElementById("ledger-search");

    this.modalInvoice = document.getElementById("modal-invoice");
    this.printableInvoiceContent = document.getElementById("printable-invoice-content");
    this.closeInvoiceModal = document.getElementById("close-invoice-modal");
    this.btnCloseReceipt = document.getElementById("btn-close-receipt");

    this.livestockGrid = document.getElementById("livestock-grid");
    this.workdaysGrid = document.getElementById("workdays-grid");
    this.seedVaultGrid = document.getElementById("seed-vault-grid");
    this.barterBoardList = document.getElementById("barter-board-list");

    this.waterDialFill = document.getElementById("water-dial-fill");
    this.waterTankVal = document.getElementById("water-tank-val");
    this.solarBatteryPercentage = document.getElementById("solar-battery-percentage");
    this.solarBatteryGrid = document.getElementById("solar-battery-grid");
    this.plotsGridContainer = document.getElementById("plots-grid-container");

    // NEW DOM ELEMENTS FOR TIERS & A11Y TOGGLING
    this.btnA11yToggle = document.getElementById("btn-a11y-toggle");
    this.appTierSelect = document.getElementById("app-tier-select");
    this.addonsContainer = document.getElementById("addons-container");
    this.addonStorefrontCheckbox = document.getElementById("addon-storefront");
    this.addonIotCheckbox = document.getElementById("addon-iot");

    // NEW DOM ELEMENTS FOR TAB 11 (DIAGNOSIS & IMAGINATION)
    this.webcamFeed = document.getElementById("webcam-feed");
    this.cameraSimFrame = document.getElementById("camera-simulation-frame");
    this.scanLine = document.querySelector(".viewfinder-scanline");
    this.scannerStatus = document.querySelector(".scanner-status-text");
    this.cameraFlash = document.getElementById("camera-flash");
    this.btnToggleCamera = document.getElementById("btn-toggle-camera");
    this.fileScanUpload = document.getElementById("file-scan-upload");
    this.mockDiseaseSelector = document.getElementById("mock-disease-selector");
    this.btnRunSimulationScan = document.getElementById("btn-run-simulation-scan");
    this.diagnosticResultsPanel = document.getElementById("diagnostic-results-panel");
    this.diagDiseaseName = document.getElementById("diag-disease-name");
    this.diagConfidenceBadge = document.getElementById("diag-confidence-badge");
    this.diagClass = document.getElementById("diag-class");
    this.diagDescription = document.getElementById("diag-description");
    this.diagSymptoms = document.getElementById("diag-symptoms");
    this.diagRemedy = document.getElementById("diag-remedy");
    this.btnInjectRemedyTask = document.getElementById("btn-inject-remedy-task");
    
    this.formGenerateBlueprint = document.getElementById("form-generate-blueprint");
    this.blueprintDisplayPanel = document.getElementById("blueprint-display-panel");
    this.blueprintLabelName = document.getElementById("blueprint-label-name");
    this.blueprintDimensionsBadge = document.getElementById("blueprint-dimensions-badge");
    this.blueprintCanvas = document.getElementById("blueprint-canvas");
    this.blueprintPlantsList = document.getElementById("blueprint-plants-list");
    this.blueprintInnovationsList = document.getElementById("blueprint-innovations-list");
    this.btnReservePlotBlueprint = document.getElementById("btn-reserve-plot-blueprint");
    this.btnSowSeedsBlueprint = document.getElementById("btn-sow-seeds-blueprint");
    this.btnExportBlueprint = document.getElementById("btn-export-blueprint");

    // NEW DOM ELEMENTS FOR SAAS READY MODULES (USDA, Settings, LoRa Gateway)
    this.settingsUsdaZone = document.getElementById("settings-usda-zone");
    this.settingsCottageFood = document.getElementById("settings-cottage-food");
    this.settingsRegionState = document.getElementById("settings-region-state");
    this.cottageFoodBanner   = document.getElementById("cottage-food-banner");
    this.stateResourcesPanel = document.getElementById("settings-state-resources");
    this.sensorPairForm      = document.getElementById("form-pair-sensor");
    this.sensorPairResult    = document.getElementById("pair-sensor-result");
    this.sensorPairList      = document.getElementById("pair-sensor-list");
    this.sensorPairWrapper   = document.getElementById("settings-pair-sensor-wrapper");
    this.loraRssi = document.getElementById("lora-rssi");
    this.loraPackets = document.getElementById("lora-packets");
    this.loraGatewayConsole = document.getElementById("lora-gateway-console");
    this.btnPingLoraNodes = document.getElementById("btn-ping-lora-nodes");

    // NEW ULTIMATE AGTECH EXPANSION DOM ELEMENTS
    this.successionCropSelect = document.getElementById("succession-crop-select");
    this.successionInterval = document.getElementById("succession-interval");
    this.btnGenerateSuccessions = document.getElementById("btn-generate-successions");
    this.successionScheduleResults = document.getElementById("succession-schedule-results");
    this.successionTimelineContainer = document.getElementById("succession-timeline-container");

    this.btnRotateHerd = document.getElementById("btn-rotate-herd");

    this.formSoilNpkCalculator = document.getElementById("form-soil-npk-calculator");
    this.soilInputN = document.getElementById("soil-input-n");
    this.soilInputP = document.getElementById("soil-input-p");
    this.soilInputK = document.getElementById("soil-input-k");
    this.soilInputPh = document.getElementById("soil-input-ph");
    this.soilTargetCrop = document.getElementById("soil-target-crop");
    this.soilAmendmentResults = document.getElementById("soil-amendment-results");
    
    this.valLabelN = document.getElementById("val-label-n");
    this.valLabelP = document.getElementById("val-label-p");
    this.valLabelK = document.getElementById("val-label-k");
    this.valLabelPh = document.getElementById("val-label-ph");

    this.amendmentQtyN = document.getElementById("amendment-qty-n");
    this.amendmentQtyP = document.getElementById("amendment-qty-p");
    this.amendmentQtyK = document.getElementById("amendment-qty-k");
    this.amendmentQtyPh = document.getElementById("amendment-qty-ph");

    this.btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
    this.btnCloseSidebar = document.getElementById("btn-close-sidebar");
    this.sidebarBackdrop = document.getElementById("sidebar-backdrop");
    this.appSidebar = document.getElementById("app-sidebar");

    // NEW DOM ELEMENTS FOR ELITE PROTOCOLS
    this.btnSyncMesh = document.getElementById("btn-sync-mesh");
    this.syncConsoleOutput = document.getElementById("sync-console-output");
    this.telemetryGateToggle = document.getElementById("telemetry-gate-toggle");
    this.telemetryGateStatus = document.getElementById("telemetry-gate-status");
    this.modalVoice = document.getElementById("modal-voice");
    this.closeVoiceModal = document.getElementById("close-voice-modal");
    this.btnVoiceListen = document.getElementById("btn-voice-listen");
    this.voiceMicPulse = document.getElementById("voice-mic-pulse");
    this.voiceTranscriptionStatus = document.getElementById("voice-transcription-status");
    this.voiceTranscribedText = document.getElementById("voice-transcribed-text");

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    this.liveDateSpan.textContent = this.currentDate.toLocaleDateString('en-US', options);
  }

  // --- EVENTS BINDING ---
  initEventListeners() {
    this.navItems.forEach(item => {
      item.addEventListener("click", () => {
        const targetTab = item.getAttribute("data-tab");
        this.switchTab(targetTab);
      });
    });

    this.cropSearch.addEventListener("input", () => this.renderCrops());
    this.btnAddCrop.addEventListener("click", () => this.showModal(this.modalCrop, "crop"));
    this.closeCropModal.addEventListener("click", () => this.hideModal(this.modalCrop));
    this.btnCancelCrop.addEventListener("click", () => this.hideModal(this.modalCrop));
    this.formAddCrop.addEventListener("submit", (e) => this.handleCropSubmit(e));

    this.btnAddTask.addEventListener("click", () => this.showModal(this.modalTask));
    this.closeTaskModal.addEventListener("click", () => this.hideModal(this.modalTask));
    this.btnCancelTask.addEventListener("click", () => this.hideModal(this.modalTask));
    this.formAddTask.addEventListener("submit", (e) => this.handleTaskSubmit(e));
    this.taskFilterCategory.addEventListener("change", () => this.renderTasks());
    this.taskFilterPriority.addEventListener("change", () => this.renderTasks());

    const columns = document.querySelectorAll(".board-column");
    columns.forEach(col => {
      col.addEventListener("dragover", (e) => this.handleDragOver(e, col));
      col.addEventListener("dragleave", (e) => this.handleDragLeave(col));
      col.addEventListener("drop", (e) => this.handleDrop(e, col));
    });

    this.btnCheckoutCart.addEventListener("click", () => this.handleCheckoutCart());
    this.closeInvoiceModal.addEventListener("click", () => this.hideModal(this.modalInvoice));
    this.btnCloseReceipt.addEventListener("click", () => this.hideModal(this.modalInvoice));

    this.closeCheckoutModal.addEventListener("click", () => this.hideModal(this.modalToolCheckout));
    this.btnCancelCheckout.addEventListener("click", () => this.hideModal(this.modalToolCheckout));
    this.formToolCheckout.addEventListener("submit", (e) => this.handleToolCheckoutSubmit(e));

    this.ledgerFilterType.addEventListener("change", () => this.renderLedgerTransactions());
    this.ledgerSearch.addEventListener("input", () => this.renderLedgerTransactions());
    this.btnPayoutPayroll.addEventListener("click", () => this.disbursePayrollCash());

    // Cache A11y and Tiers settings updates
    this.btnA11yToggle.addEventListener("click", () => this.toggleAccessibilityMode());
    this.appTierSelect.addEventListener("change", () => this.handleTierSelectChange());
    this.addonStorefrontCheckbox.addEventListener("change", () => this.handleAddonCheckboxChange());
    this.addonIotCheckbox.addEventListener("change", () => this.handleAddonCheckboxChange());

    // NEW EVENT LISTENERS FOR TAB 11 (DIAGNOSIS & IMAGINATION)
    this.btnToggleCamera.addEventListener("click", () => this.toggleCameraStream());
    this.fileScanUpload.addEventListener("change", (e) => this.handlePhotoUpload(e));
    this.btnRunSimulationScan.addEventListener("click", () => this.runSimulatedScan());
    this.btnInjectRemedyTask.addEventListener("click", () => this.injectRemedyTask());
    this.formGenerateBlueprint.addEventListener("submit", (e) => this.handleBlueprintSubmit(e));
    this.btnReservePlotBlueprint.addEventListener("click", () => this.reservePlotFromBlueprint());
    this.btnSowSeedsBlueprint.addEventListener("click", () => this.sowSeedsFromBlueprint());
    this.btnExportBlueprint.addEventListener("click", () => this.exportBlueprintCanvas());

    // NEW EVENT LISTENERS FOR SAAS READY MODULES
    this.settingsUsdaZone.addEventListener("change", () => this.handleUsdaZoneChange());
    this.settingsCottageFood.addEventListener("input", () => this.handleCottageFoodChange());
    if (this.settingsRegionState) {
      this.settingsRegionState.addEventListener("input", () => this.handleRegionStateChange());
    }
    // Re-evaluate compliance whenever the validator finishes loading its rules.
    window.addEventListener("cg-cottage-food-ready", () => this.renderCart());
    // Refresh the local-resources panel when the state-resources data loads.
    window.addEventListener("cg-state-resources-ready", () => this.renderStateResourcesPanel());

    // T1.3: sensor-pairing form + rotate.
    if (this.sensorPairForm) {
      this.sensorPairForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handlePairSensor();
      });
      // When the operator expands the panel, list existing sensors.
      if (this.sensorPairWrapper) {
        this.sensorPairWrapper.addEventListener("toggle", () => {
          if (this.sensorPairWrapper.open) this.renderSensorList();
        });
      }
    }
    this.btnPingLoraNodes.addEventListener("click", () => this.pingLoraNodes());

    // NEW ULTIMATE AGTECH EXPANSION LISTENERS
    this.btnGenerateSuccessions.addEventListener("click", () => this.generateSuccessionTimeline());
    this.btnRotateHerd.addEventListener("click", () => this.rotateGrazingHerd());
    this.soilInputN.addEventListener("input", () => this.valLabelN.textContent = `${this.soilInputN.value} ppm`);
    this.soilInputP.addEventListener("input", () => this.valLabelP.textContent = `${this.soilInputP.value} ppm`);
    this.soilInputK.addEventListener("input", () => this.valLabelK.textContent = `${this.soilInputK.value} ppm`);
    this.soilInputPh.addEventListener("input", () => this.valLabelPh.textContent = Number(this.soilInputPh.value).toFixed(1));
    this.formSoilNpkCalculator.addEventListener("submit", (e) => this.handleSoilCalculatorSubmit(e));

    // ACCESSIBILITY: Keyboard short-cuts tab listeners (1 to 0, and D/V for Vision tab)
    document.addEventListener("keydown", (e) => {
      // Don't switch tabs if typing in form input spaces
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || e.target.isContentEditable) {
        return;
      }
      
      const tabKeys = {
        "1": "dashboard", "2": "crops", "3": "tasks", "4": "store",
        "5": "tools", "6": "ledger", "7": "livestock", "8": "workdays",
        "9": "barter", "0": "resources", "d": "diagnosis", "v": "diagnosis",
        "D": "diagnosis", "V": "diagnosis"
      };

      if (tabKeys[e.key]) {
        e.preventDefault();
        this.switchTab(tabKeys[e.key]);
      }
    });

    // NEW EVENT LISTENERS FOR ELITE PROTOCOLS
    if (this.btnSyncMesh) {
      this.btnSyncMesh.addEventListener("click", () => this.syncMeshReplicas());
    }
    if (this.telemetryGateToggle) {
      this.telemetryGateToggle.addEventListener("change", () => this.handleGateNodeToggle());
    }
    if (this.btnVoiceListen) {
      this.btnVoiceListen.addEventListener("click", () => this.startSpeechRecognition());
    }
    if (this.closeVoiceModal) {
      this.closeVoiceModal.addEventListener("click", () => this.hideModal(this.modalVoice));
    }

    // F-03: Event bindings for Offline Text Console Input Fallback
    const btnSubmitVoiceText = document.getElementById("btn-submit-voice-text");
    const voiceTextFallbackInput = document.getElementById("voice-text-fallback");
    if (btnSubmitVoiceText && voiceTextFallbackInput) {
      btnSubmitVoiceText.addEventListener("click", () => {
        const text = voiceTextFallbackInput.value.trim();
        if (text) {
          this.voiceTranscribedText.textContent = `"${text}"`;
          this.voiceTranscriptionStatus.textContent = "TEXT INPUT SUBMITTED";
          this.voiceTranscriptionStatus.style.color = "var(--accent-sky)";
          this.parseVoiceIntent(text);
          voiceTextFallbackInput.value = "";
        }
      });
      voiceTextFallbackInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          btnSubmitVoiceText.click();
        }
      });
    }

    // Mobile sidebar toggle interactions
    if (this.btnToggleSidebar) {
      this.btnToggleSidebar.addEventListener("click", () => {
        this.appSidebar.classList.add("active");
        this.sidebarBackdrop.classList.add("active");
      });
    }
    if (this.btnCloseSidebar) {
      this.btnCloseSidebar.addEventListener("click", () => {
        this.appSidebar.classList.remove("active");
        this.sidebarBackdrop.classList.remove("active");
      });
    }
    if (this.sidebarBackdrop) {
      this.sidebarBackdrop.addEventListener("click", () => {
        this.appSidebar.classList.remove("active");
        this.sidebarBackdrop.classList.remove("active");
      });
    }
  }

  // --- INITIALIZE A11Y & TIER ON BOOTSTRAP ---
  initAccessibilityState() {
    // 1. Accessibility State Sync
    if (this.focusModeActive) {
      document.body.classList.add("focus-mode");
      this.btnA11yToggle.style.color = "var(--accent-clay)";
    } else {
      document.body.classList.remove("focus-mode");
      this.btnA11yToggle.style.color = "var(--text-secondary)";
    }

    // 2. Pricing Tier State Sync
    this.appTierSelect.value = this.pricingTier;
    if (this.pricingTier === "basic") {
      if (this.addonsContainer) this.addonsContainer.style.display = "flex";
      if (this.addonStorefrontCheckbox) this.addonStorefrontCheckbox.checked = this.addonStorefront;
      if (this.addonIotCheckbox) this.addonIotCheckbox.checked = this.addonIot;
    } else {
      if (this.addonsContainer) this.addonsContainer.style.display = "none";
    }

    // 3. SaaS Setup state sync
    this.settingsUsdaZone.value = this.usdaZone;
    this.settingsCottageFood.value = this.cottageFoodStatement;
    if (this.settingsRegionState) this.settingsRegionState.value = this.regionStateCode;
    this.renderStateResourcesPanel();
  }

  // ----- Cottage-food compliance helpers -----------------------------------
  // The validator publishes a global once its JSON loads; until then these
  // helpers no-op. App-level callers must never assume the validator is ready.

  _cottageFoodInput() {
    // Annual storefront revenue: sum of income transactions categorised under
    // 'Storefront' (matches what cloudLedger.js maps to source='storefront').
    const year = new Date().getFullYear();
    const annualRevenueUSD = this.transactions
      .filter(t => t.type === 'income'
        && /storefront|cottage/i.test(t.category || '')
        && new Date(t.date).getFullYear() === year)
      .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);

    // Pending cart contents → category-count map.
    const cartProducts = Object.keys(this.cart).map(id =>
      this.storeProducts.find(p => p.id === id)).filter(Boolean);
    const productCategoryCounts = window.cgCottageFood && window.cgCottageFood.ready
      ? window.cgCottageFood.summariseProductCategories(cartProducts)
      : {};

    return {
      stateCode: this.regionStateCode || null,
      annualRevenueUSD,
      productCategoryCounts,
      poultryAnnualBirds: 0,    // wire in livestock module when available
      rawMilkGallonsAnnual: 0
    };
  }

  renderCottageFoodBanner() {
    if (!this.cottageFoodBanner) return;
    if (!window.cgCottageFood || !window.cgCottageFood.ready) {
      this.cottageFoodBanner.innerHTML = '';
      return;
    }
    this.cottageFoodBanner.innerHTML =
      window.cgCottageFood.getStorefrontBannerHTML(this._cottageFoodInput());
  }

  handleRegionStateChange() {
    this.regionStateCode = (this.settingsRegionState.value || "").trim().toUpperCase();
    this.saveToStorage();
    this.renderCottageFoodBanner();
    this.renderStateResourcesPanel();
    this.addActivity(
      this.regionStateCode
        ? `Storefront state set to ${this.regionStateCode} (cottage-food rules will apply)`
        : `Storefront state cleared — falling back to conservative defaults`,
      "system", "⚖️");

    // T3.4: persist to the cooperative row in Supabase if signed in. Fire-
    // and-forget — failure here doesn't block the local save.
    if (window.cloudLedger && typeof window.cloudLedger.updateRegionState === 'function') {
      window.cloudLedger.updateRegionState(this.regionStateCode).catch(err => {
        console.warn('[app] region_state cloud sync failed:', err.message || err);
      });
    }
  }

  renderStateResourcesPanel() {
    if (!this.stateResourcesPanel) return;
    if (!window.cgStateResources || !window.cgStateResources.ready) {
      this.stateResourcesPanel.innerHTML = '<em style="font-size:0.7rem;color:var(--text-muted);">Loading state resources…</em>';
      return;
    }

    let html = window.cgStateResources.getResourcePanelHTML(this.regionStateCode);

    // T5.1 + T1.4: Append a data-freshness block that pulls both datasets'
    // last-verified dates. Loud advisory when EITHER dataset is stale OR
    // the state is low-confidence — the operator needs to know we don't
    // fully trust our own rule cache for their location.
    if (this.regionStateCode) {
      const cf  = window.cgCottageFood   && window.cgCottageFood.getFreshness   && window.cgCottageFood.getFreshness(this.regionStateCode);
      const ext = window.cgStateResources && window.cgStateResources.getFreshness && window.cgStateResources.getFreshness(this.regionStateCode);
      if (cf || ext) {
        const stale = (cf && cf.isStale) || (ext && ext.isStale);
        const cls = stale ? 'cg-freshness cg-freshness-stale' : 'cg-freshness';
        html += `
<div class="${cls}" role="${stale ? 'alert' : 'status'}">
  <div class="cg-freshness-h">${stale ? '⚠️ Data verification needed' : '🗓️ Data freshness'}</div>
  ${cf  ? `<div class="cg-freshness-line">${this._escapeText(cf.label)}</div>` : ''}
  ${ext ? `<div class="cg-freshness-line">${this._escapeText(ext.label)}</div>` : ''}
  ${stale ? `<div class="cg-freshness-note">
    For ${this._escapeText(this.regionStateCode)}, treat compliance outputs as hints.
    Verify cottage-food rules with your State Department of Agriculture before
    listing new products.
  </div>` : ''}
</div>`;
      }
    }

    this.stateResourcesPanel.innerHTML = html;
  }

  _escapeText(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // T1.3 / T2.3: pair a new ESP32 sensor + manage existing ones --------------
  async handlePairSensor() {
    if (!this.sensorPairResult) return;
    if (!window.cloudLedger || typeof window.cloudLedger.provisionHardwareNode !== 'function') {
      this.sensorPairResult.innerHTML = '<div class="cg-pair-error">Sign in (cloud sync) first — pairing needs a coop admin session.</div>';
      return;
    }
    const nodeId      = document.getElementById('pair-node-id').value.trim();
    const nodeType    = document.getElementById('pair-node-type').value;
    const displayName = document.getElementById('pair-display-name').value.trim() || null;

    if (!/^Node-[A-Za-z0-9-]{1,32}$/.test(nodeId)) {
      this.sensorPairResult.innerHTML = '<div class="cg-pair-error">Node ID must look like Node-G02.</div>';
      return;
    }

    this.sensorPairResult.innerHTML = '<em>Provisioning…</em>';
    try {
      const hexSecret = await window.cloudLedger.provisionHardwareNode({
        nodeId, nodeType, displayName
      });
      this.sensorPairResult.innerHTML = this._renderPairResult(nodeId, hexSecret, 'New sensor');
      this.sensorPairForm.reset();
      this.renderSensorList();
      this.addActivity(`Paired sensor ${nodeId} (${nodeType})`, 'system', '🔧');
    } catch (err) {
      this.sensorPairResult.innerHTML =
        `<div class="cg-pair-error">Pairing failed: ${this._escapeText(err.message || String(err))}</div>`;
    }
  }

  async rotateSensorSecret(nodeId) {
    if (!confirm(`Rotate the HMAC secret for ${nodeId}? The device will stop accepting telemetry until you re-pair its serial shell.`)) return;
    try {
      const hex = await window.cloudLedger.rotateHardwareNodeSecret(nodeId);
      this.sensorPairResult.innerHTML = this._renderPairResult(nodeId, hex, 'Rotated secret');
      this.addActivity(`Rotated HMAC secret for sensor ${nodeId}`, 'system', '🔁');
    } catch (err) {
      this.sensorPairResult.innerHTML =
        `<div class="cg-pair-error">Rotate failed: ${this._escapeText(err.message || String(err))}</div>`;
    }
  }

  _renderPairResult(nodeId, hexSecret, headline) {
    return `
<div class="cg-pair-success" role="alert">
  <div class="cg-pair-h">✅ ${this._escapeText(headline)} — ${this._escapeText(nodeId)}</div>
  <div class="cg-pair-instructions">
    Paste this into the ESP32's USB-serial shell now. This is the only time
    the secret is readable.
  </div>
  <input type="text" readonly value="set-secret ${this._escapeText(hexSecret)}" onclick="this.select()" class="cg-pair-secret" aria-label="Secret command for serial shell">
  <div class="cg-pair-note">Then run <code>commit</code> on the device shell.</div>
</div>`;
  }

  async renderSensorList() {
    if (!this.sensorPairList) return;
    if (!window.cloudLedger || typeof window.cloudLedger.listHardwareNodes !== 'function') {
      this.sensorPairList.innerHTML = '<em>Sign in to list paired sensors.</em>';
      return;
    }
    try {
      const nodes = await window.cloudLedger.listHardwareNodes();
      if (!nodes.length) {
        this.sensorPairList.innerHTML = '<em>No sensors paired yet.</em>';
        return;
      }
      this.sensorPairList.innerHTML = '<div class="cg-pair-list-h">Paired sensors</div>' +
        nodes.map(n => `
          <div class="cg-pair-row">
            <span class="cg-pair-row-id">${this._escapeText(n.id)}</span>
            <span class="cg-pair-row-type">${this._escapeText(n.node_type)}</span>
            <span class="cg-pair-row-seen">${n.last_seen_at ? 'seen ' + new Date(n.last_seen_at).toLocaleDateString() : 'never seen'}</span>
            <button class="btn-secondary btn-sm" onclick="app.rotateSensorSecret('${this._escapeText(n.id)}')" style="font-size: 0.65rem; padding: 2px 6px;">Rotate</button>
          </div>`).join('');
    } catch (err) {
      this.sensorPairList.innerHTML = `<em>Could not list sensors: ${this._escapeText(err.message || err)}</em>`;
    }
  }

  // --- ACCESSIBILITY TOGGLE CORE ---
  toggleAccessibilityMode() {
    this.focusModeActive = !this.focusModeActive;
    this.initAccessibilityState();
    
    // Log action in history
    const stateText = this.focusModeActive ? "activated Focus Mode" : "disabled Focus Mode";
    this.addActivity(`Bekah ${stateText} for high-contrast accessibility`, "system", "👁️");
    
    this.saveToStorage();
    this.render();
  }

  // --- SOFTWARE PRICING TIER CONTROLLER ---
  handleTierSelectChange() {
    this.pricingTier = this.appTierSelect.value;
    this.initAccessibilityState();
    this.saveToStorage();
    
    const tierName = this.pricingTier === "pro" ? "Pro / Co-op Bundle ($39/mo)" : "Free / Basic Tier";
    this.addActivity(`Software configuration changed to: ${tierName}`, "system", "⚙️");
    
    this.render();
  }

  handleAddonCheckboxChange() {
    this.addonStorefront = this.addonStorefrontCheckbox.checked;
    this.addonIot = this.addonIotCheckbox.checked;
    this.saveToStorage();
    
    this.addActivity(`Add-on options modified: Storefront [${this.addonStorefront ? "ON" : "OFF"}], IoT Grid [${this.addonIot ? "ON" : "OFF"}]`, "system", "⚙️");
    
    this.render();
  }

  // Simulated upgrade modal response
  upgradeSoftwareTier() {
    this.pricingTier = "pro";
    this.appTierSelect.value = "pro";
    this.initAccessibilityState();
    this.addActivity(`Software successfully upgraded to Pro / Co-op Bundle ($39/mo)!`, "system", "🎉");
    this.saveToStorage();
    this.render();
    this.showToast("Success! You successfully upgraded to the Pro / Co-op Bundle ($39/mo). All community storefronts, tool accruals, payroll systems, seed vaults, and water/solar utility monitors are now fully unlocked!", "success");
  }

  purchaseAddon(addonName) {
    if (addonName === "storefront") {
      this.addonStorefront = true;
      if (this.addonStorefrontCheckbox) this.addonStorefrontCheckbox.checked = true;
      this.addActivity(`Purchased standalone Storefront Add-on ($29/mo)!`, "system", "💳");
      this.showToast("Success! You successfully purchased the Storefront & CSA Sales Add-on ($29/mo). Individual produce sales and custom cottage food disclaimers are now fully unlocked!", "success");
    } else if (addonName === "iot") {
      this.addonIot = true;
      if (this.addonIotCheckbox) this.addonIotCheckbox.checked = true;
      this.addActivity(`Purchased standalone IoT Smart Grid Add-on ($19/mo)!`, "system", "📡");
      this.showToast("Success! You successfully purchased the Smart IoT & Resource Grid Add-on ($19/mo). Live LoRaWAN telemetry pings and gateway diagnostics are now fully unlocked!", "success");
    }
    this.saveToStorage();
    this.render();
  }

  // --- TAB NAVIGATION TAB CONTROLLER ---
  switchTab(tabId) {
    this.navItems.forEach(item => {
      if (item.getAttribute("data-tab") === tabId) {
        item.classList.add("active");
        item.setAttribute("aria-selected", "true");
      } else {
        item.classList.remove("active");
        item.setAttribute("aria-selected", "false");
      }
    });

    this.tabContents.forEach(tab => {
      if (tab.id === `${tabId}-tab`) {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });

    const titles = {
      dashboard: "Dashboard",
      crops: "Crop Planner",
      tasks: "Co-op Task Board",
      store: "Co-op Storefront & CSA",
      tools: "Tool Rental Library",
      ledger: "Financial Ledger & Goals",
      livestock: "Livestock & Flock Logs",
      workdays: "Co-op Workdays & Events",
      barter: "Barter Board & Seed Vault",
      resources: "Communal Resource Grid",
      diagnosis: "AI Diagnosis & Imagination Spaces"
    };

    const subtitles = {
      dashboard: "Welcome back, Bekah. Here is today's overview.",
      crops: "Plan, track growth stages, and record harvesting schedules.",
      tasks: "Coordinate land management and chores across community members.",
      store: "Trade produce surplus with neighbors and track CSA commitments.",
      tools: "Share heavy machinery with neighboring farms to earn library fees.",
      ledger: "Track all revenues, speculative assets, and path to your $10k goal.",
      livestock: "Log daily egg collections, dairy milkings, flock numbers, and health.",
      workdays: "Organize community planting days, henhouse insulation sessions, and feast RSVPs.",
      barter: "Checkout organic seed vaults and post barter board skill listings.",
      resources: "Real-time indicators showing solar grid levels, rain cistern reservoirs, and plot reserves.",
      diagnosis: "Simulate live scans for crop plant diseases and draft dynamic companion guilds blueprints."
    };

    this.viewTitle.textContent = titles[tabId] || "Dashboard";
    this.viewSubtitle.textContent = subtitles[tabId] || "";

    if (this.appSidebar) this.appSidebar.classList.remove("active");
    if (this.sidebarBackdrop) this.sidebarBackdrop.classList.remove("active");

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Log activity
  addActivity(text, type, iconEmoji) {
    const newActivity = {
      id: `act-${Date.now()}`,
      text,
      time: "Just now",
      type,
      icon: iconEmoji
    };
    this.activities.unshift(newActivity);
    if (this.activities.length > 15) this.activities.pop();
  }

  // Modals
  showModal(modal, type = "") {
    modal.classList.add("active");
    if (type === "crop") {
      const localTodayString = this.currentDate.toISOString().split("T")[0];
      document.getElementById("crop-planted-date").value = localTodayString;
    }
  }

  hideModal(modal) {
    modal.classList.remove("active");
    if (modal.id === "modal-voice") {
      this.isListening = false;
      this.voiceMicPulse.classList.remove("active");
      // Tear down whichever recognizer is active.
      if (this._offlineVoice) {
        try { this._offlineVoice.stop(); } catch(err) {}
        this._offlineVoice = null;
      }
      if (this.speechRecognizer) {
        try { this.speechRecognizer.stop(); } catch(err) {}
      }
      this.releaseFocusIsolate();
    }
  }

  // ==========================================================================
  // --- ELITE OPERATIONAL ALGORITHMS (P2P Mesh, ESP32 Middleware, Voice API) ---
  // ==========================================================================

  // 1. CRDT Local-First Mesh Synchronization Consensus Engine
  syncMeshReplicas() {
    const syncBtn = this.btnSyncMesh;
    const consoleLog = this.syncConsoleOutput;
    
    syncBtn.disabled = true;
    syncBtn.innerHTML = "⏳ Synthesizing Consensus replicas...";
    
    // Animate mesh nodes
    const nodes = document.querySelectorAll(".mesh-device-node");
    nodes.forEach(n => n.classList.add("syncing"));
    
    const logs = [
      `[EDGESYNC] Initiating cryptographic replicator audit...`,
      `[MESH] Synced with Tablet (Barn Pi Hub) - Merged 2 commits.`,
      `[CRDT] Consolidating conflict-free ledger vector logs...`,
      `[CRDT] Hash roots verified. Merged Dave's and Sarah's chore logs.`,
      `[SOVEREIGN] mesh consensus resolved: root 0x9B4E8C2F3D`,
      `[SYSTEM] State fully synced across eco-village edge nodes offline-first!`
    ];
    
    consoleLog.innerHTML = "";
    let step = 0;
    
    const interval = setInterval(() => {
      if (step < logs.length) {
        const div = document.createElement("div");
        div.textContent = logs[step];
        div.style.color = step === logs.length - 1 ? "var(--accent-sage)" : "var(--accent-sky)";
        consoleLog.appendChild(div);
        consoleLog.scrollTop = consoleLog.scrollHeight;
        step++;
      } else {
        clearInterval(interval);
        syncBtn.disabled = false;
        syncBtn.innerHTML = "🔄 Sync Mesh Replicas (CRDT)";
        nodes.forEach(n => n.classList.remove("syncing"));
        this.addActivity("Local Mesh Synchronization: Cryptographic CRDT consensus updated completely", "system", "🛡️");
        this.render();
      }
    }, 600);
  }

  // 2. Zero-Friction ESP32 Telemetry Gate Node listener middleware
  handleGateNodeToggle() {
    const isChecked = this.telemetryGateToggle.checked;
    const statusEl = this.telemetryGateStatus;
    const consoleLog = this.loraGatewayConsole;
    
    if (isChecked) {
      statusEl.innerHTML = "Gate: <strong style='color: var(--accent-sage);'>OPEN</strong> (Herd auto-rotating!)";
      
      const logLine = document.createElement("div");
      logLine.innerHTML = `<span style="color: var(--accent-clay);">[${new Date().toLocaleTimeString()}] [NODE-G02] GATE OPEN: Cattle fence sensors active, beef cattle moving.</span>`;
      consoleLog.appendChild(logLine);
      consoleLog.scrollTop = consoleLog.scrollHeight;
      
      this.addActivity("ESP32 Gate Telemetry Node Node-G02: gate triggered OPEN. Rotating herd automatically.", "system", "🔄");
      
      // Auto rotate herd!
      setTimeout(() => {
        this.rotateGrazingHerd();
        
        // Reset switch toggle gracefully after 3 seconds, representing event resolution
        setTimeout(() => {
          if (this.telemetryGateToggle) {
            this.telemetryGateToggle.checked = false;
            statusEl.innerHTML = "Gate: <strong>CLOSED</strong> (Herd stationary). Toggle to simulate beef cattle movement.";
            const closeLine = document.createElement("div");
            closeLine.textContent = `[${new Date().toLocaleTimeString()}] [NODE-G02] GATE CLOSED: Stationary position verified.`;
            consoleLog.appendChild(closeLine);
            consoleLog.scrollTop = consoleLog.scrollHeight;
            this.saveToStorage();
          }
        }, 3000);
      }, 800);
    }
  }

  // T5.2: focusFramework.json bootstrap --------------------------------------
  // Fetches the focus-state design tokens and applies them as CSS custom
  // properties. Surfaces statusBadgeDefinitions for any view that wants to
  // render quiet semantic badges (e.g. paddock cards, livestock cards).
  async loadFocusFramework() {
    try {
      const r = await fetch('./focusFramework.json', { cache: 'force-cache' });
      if (!r.ok) return;
      const framework = await r.json();
      const root = document.documentElement;

      // Visual tokens → CSS custom properties prefixed with --cg-token-*
      const colors = (framework.visualTokens && framework.visualTokens.colors) || {};
      for (const [name, hex] of Object.entries(colors)) {
        root.style.setProperty(`--cg-token-${name.replace(/[^a-z0-9-]/gi, '-')}`, hex);
      }

      // Theme attribute so CSS can scope rules like [data-cg-theme="RestorativeSerenity"]
      if (framework.theme) root.setAttribute('data-cg-theme', framework.theme);

      window.cgFocus = {
        ready:     true,
        theme:     framework.theme || null,
        tokens:    framework.visualTokens || {},
        focusStates: framework.focusStates || {},
        badges:    framework.statusBadgeDefinitions || {},
        renderBadge(key) {
          const def = (framework.statusBadgeDefinitions || {})[key];
          if (!def) return '';
          const bg = colors[def.backgroundColor] || def.backgroundColor;
          const fg = colors[def.textColor]       || def.textColor;
          return `<span class="cg-focus-badge" style="background:${bg};color:${fg};padding:2px 8px;border-radius:999px;font-size:0.7rem;font-weight:600;">${def.icon || ''} ${def.label || key}</span>`;
        }
      };

      window.dispatchEvent(new CustomEvent('cg-focus-ready'));
    } catch (err) {
      console.warn('[app] focusFramework failed to load:', err.message || err);
      window.cgFocus = { ready: false, badges: {}, renderBadge: () => '' };
    }
  }

  // T1.2: Offline voice asset download flow ----------------------------------
  // Lazy-fetches the ~40 MB Vosk model + library via the service worker's
  // precache-voice message channel. Avoids blocking the SW install on a slow
  // first connection.
  async setupVoiceDownloadButton() {
    const btn    = document.getElementById('btn-voice-download-offline');
    const status = document.getElementById('voice-download-status');
    if (!btn || !status) return;

    const refresh = async () => {
      if (!window.cgVoice) { btn.style.display = 'none'; return; }
      const ok = await window.cgVoice.isOfflineVoiceAvailable();
      if (ok) {
        btn.style.display = 'none';
        status.textContent = '✓ Offline voice ready (no cloud).';
        status.style.color = 'var(--accent-sage, #9ec582)';
      } else {
        btn.style.display = '';
        status.textContent = 'Offline voice not provisioned. Cloud fallback is OFF unless explicitly enabled.';
        status.style.color = 'var(--text-muted)';
      }
    };
    await refresh();

    btn.onclick = async () => {
      const cfg = (window.cgVoice && window.cgVoice.config) || {
        libUrl:     './vendor/vosk-browser/vosk.js',
        modelUrl:   './models/vosk-model-small-en-us-0.15.tar.gz',
        workletUrl: './vosk-resampler-worklet.js'
      };
      const urls = [cfg.libUrl, cfg.modelUrl, cfg.workletUrl];

      if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
        status.textContent = 'Service worker not active — refresh the page and try again.';
        status.style.color = 'var(--accent-clay)';
        return;
      }

      btn.disabled = true;
      const originalLabel = btn.textContent;
      btn.textContent = '⏳ Downloading…';
      status.textContent = 'Downloading offline voice assets (~40 MB). Stay on Wi-Fi.';
      status.style.color = 'var(--accent-amber)';

      navigator.serviceWorker.controller.postMessage({ type: 'precache-voice', urls });

      // The SW's cache.addAll is fire-and-forget; poll availability for up
      // to 5 minutes (the model is ~40 MB on most US broadband ≈30s, slow
      // mobile up to a few minutes).
      const start = Date.now();
      const interval = setInterval(async () => {
        const ok = await window.cgVoice.isOfflineVoiceAvailable();
        if (ok) {
          clearInterval(interval);
          btn.disabled = false;
          btn.textContent = originalLabel;
          await refresh();
        } else if (Date.now() - start > 5 * 60 * 1000) {
          clearInterval(interval);
          btn.disabled = false;
          btn.textContent = originalLabel;
          status.textContent = 'Download taking longer than 5 min — check connection or vendor URL.';
          status.style.color = 'var(--accent-clay)';
        }
      }, 3000);
    };
  }

  // 3. Natural Language Web Speech logs modal
  openVoiceModal(liveId) {
    this.activeVoiceLiveId = liveId;
    const live = this.livestock.find(l => l.id === liveId);
    if (!live) return;

    this.voiceTranscribedText.textContent = "(Waiting for voice command...)";
    this.voiceTranscriptionStatus.textContent = "READY";
    this.voiceTranscriptionStatus.style.color = "var(--accent-sky)";

    this.showModal(this.modalVoice);

    // T1.2: surface the offline-voice download button if needed.
    this.setupVoiceDownloadButton();

    // Cognitive load isolation fade
    const tabEl = document.getElementById("livestock-tab");
    this.isolateFocusPanel(tabEl);
  }

  // Cognitive Isolate focus wrapper
  isolateFocusPanel(panelEl) {
    document.body.classList.add("cognitive-focus-active");
    panelEl.classList.add("focus-isolated-panel");
  }

  releaseFocusIsolate() {
    document.body.classList.remove("cognitive-focus-active");
    document.querySelectorAll(".focus-isolated-panel").forEach(p => p.classList.remove("focus-isolated-panel"));
  }

  // 4. Speech recognition — offline-first via Vosk-WASM (voiceLogger.js).
  //    The deprecated webkitSpeechRecognition path streams audio to Google/
  //    Apple servers and is therefore opt-in only:
  //      window.cgVoiceAllowCloudFallback = true   // (NOT recommended)
  //    If neither is available we surface a clear setup message instead of
  //    silently degrading.
  async startSpeechRecognition() {
    // Toggle: if already listening, stop the active recognizer.
    if (this.isListening) {
      if (this._offlineVoice) {
        this.btnVoiceListen.disabled = true;
        try {
          const finalText = await this._offlineVoice.stop();
          if (finalText) {
            this.voiceTranscribedText.textContent = `"${finalText}"`;
            this.parseVoiceIntent(finalText);
          } else {
            this.voiceTranscribedText.textContent = "(no speech recognised)";
          }
        } catch (err) {
          console.error("Failed stopping offline voice:", err);
        } finally {
          this._offlineVoice = null;
          this.stopListeningUI();
          this.btnVoiceListen.disabled = false;
        }
        return;
      }
      if (this.speechRecognizer) {
        try { this.speechRecognizer.stop(); } catch (err) {}
        return;
      }
    }

    // Try offline Vosk-WASM first.
    if (window.cgVoice) {
      const ok = await window.cgVoice.isOfflineVoiceAvailable();
      if (ok) {
        try {
          await this._startOfflineSpeech();
          return;
        } catch (err) {
          console.warn("Offline voice failed to start:", err);
          this.voiceTranscriptionStatus.textContent =
              "OFFLINE VOICE FAILED — " + (err.message || "unknown error");
          this.voiceTranscriptionStatus.style.color = "var(--accent-clay)";
          if (!window.cgVoiceAllowCloudFallback) return;
        }
      } else {
        this.voiceTranscriptionStatus.textContent = "OFFLINE VOICE NOT PROVISIONED";
        this.voiceTranscriptionStatus.style.color = "var(--accent-amber)";
        this.voiceTranscribedText.textContent =
            "Voice logging needs the offline model. See voiceLogger.js header for " +
            "setup (vendor/vosk-browser/ + models/vosk-model-small-en-us-0.15.tar.gz)." +
            (window.cgVoiceAllowCloudFallback ? " Falling back to cloud speech…" : "");
        if (!window.cgVoiceAllowCloudFallback) return;
      }
    }

    // Opt-in cloud fallback (Chrome/Safari proprietary). Off by default.
    this._startCloudSpeechRecognition();
  }

  async _startOfflineSpeech() {
    this._offlineVoice = new window.cgVoice.OfflineVoiceLogger({
      onStatus: ({ state, message }) => {
        this.voiceTranscriptionStatus.textContent = message;
        this.voiceTranscriptionStatus.style.color =
            state === "error"     ? "var(--accent-clay)"  :
            state === "listening" ? "var(--accent-amber)" :
                                    "var(--accent-sky)";
      },
      onPartial: (partial) => {
        this.voiceTranscribedText.textContent = `"${partial}…"`;
      },
      onFinal: (full) => {
        this.voiceTranscribedText.textContent = `"${full}"`;
      }
    });
    await this._offlineVoice.start();
    this.isListening = true;
    this.btnVoiceListen.textContent = "🛑 Stop Listening";
    this.btnVoiceListen.style.background = "var(--accent-clay)";
    this.voiceMicPulse.classList.add("active");
  }

  _startCloudSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.voiceTranscriptionStatus.textContent = "SPEECH API UNSUPPORTED IN THIS BROWSER";
      this.voiceTranscriptionStatus.style.color = "var(--accent-clay)";
      this.voiceTranscribedText.textContent =
          "Voice logging requires either the offline Vosk model (recommended) " +
          "or webkitSpeechRecognition (Chrome/Safari). Use the high-fidelity mock presets below.";
      return;
    }
    try {
      this.speechRecognizer = new SpeechRecognition();
      this.speechRecognizer.continuous = false;
      this.speechRecognizer.lang = "en-US";
      this.speechRecognizer.interimResults = false;

      this.speechRecognizer.onstart = () => {
        this.isListening = true;
        this.btnVoiceListen.textContent = "🛑 Stop Listening";
        this.btnVoiceListen.style.background = "var(--accent-clay)";
        this.voiceTranscriptionStatus.textContent = "SPEAK NOW (cloud) - LISTENING...";
        this.voiceTranscriptionStatus.style.color = "var(--accent-amber)";
        this.voiceMicPulse.classList.add("active");
      };
      this.speechRecognizer.onerror = (e) => {
        console.error("Speech recognition error:", e);
        this.voiceTranscriptionStatus.textContent = "SPEECH ERROR: BLOCKED / NO MIC";
        this.voiceTranscriptionStatus.style.color = "var(--accent-clay)";
        this.stopListeningUI();
      };
      this.speechRecognizer.onend = () => this.stopListeningUI();
      this.speechRecognizer.onresult = (e) => {
        const resultText = e.results[0][0].transcript;
        this.voiceTranscribedText.textContent = `"${resultText}"`;
        this.parseVoiceIntent(resultText);
      };
      this.speechRecognizer.start();
    } catch (err) {
      console.error("Failed to build SpeechRecognition context:", err);
    }
  }

  stopListeningUI() {
    this.isListening = false;
    this.btnVoiceListen.textContent = "🎙️ Start Web Speech Recognition";
    this.btnVoiceListen.style.background = "var(--accent-sky)";
    this.voiceMicPulse.classList.remove("active");
  }

  // 5. Natural Language voice parsing algorithms
  parseVoiceIntent(transcript) {
    const text = transcript.toLowerCase();
    const live = this.livestock.find(l => l.id === this.activeVoiceLiveId);
    if (!live) return;
    
    let parsedQty = null;
    let setHealthExcellent = false;
    
    // Quick number word conversion mapping
    const numbersWords = {
      "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
      "eleven": 11, "twelve": 12, "dozen": 12, "twenty": 20, "thirty": 30, "fifty": 50, "hundred": 100
    };
    
    // Check numeric value words
    Object.keys(numbersWords).forEach(word => {
      if (text.includes(word)) {
        parsedQty = numbersWords[word];
      }
    });
    
    // Search literal digits inside speech text
    const digitMatch = text.match(/\d+/);
    if (digitMatch) {
      parsedQty = parseInt(digitMatch[0], 10);
    }
    
    if (text.includes("healthy") || text.includes("perfect") || text.includes("excellent")) {
      setHealthExcellent = true;
    }
    
    if (parsedQty !== null) {
      // Input set
      const inputEl = document.getElementById(`harvest-input-${live.id}`);
      if (inputEl) {
        inputEl.value = parsedQty;
      }
      
      if (setHealthExcellent) {
        live.health = "Excellent";
      }
      
      this.voiceTranscriptionStatus.textContent = "INTENT PARSED: HARVEST EXECUTING!";
      this.voiceTranscriptionStatus.style.color = "var(--accent-sage)";
      
      setTimeout(() => {
        this.logLivestockYield(live.id);
        this.hideModal(this.modalVoice);
      }, 1000);
    } else {
      this.voiceTranscriptionStatus.textContent = "UNABLE TO PARSE INTENT. TRY AGAIN.";
      this.voiceTranscriptionStatus.style.color = "var(--accent-amber)";
    }
  }

  // Simulated Voice Command intent preset fallback
  simulateVoiceIntent(type) {
    const live = this.livestock.find(l => l.id === this.activeVoiceLiveId);
    if (!live) return;
    
    this.voiceMicPulse.classList.add("active");
    this.voiceTranscriptionStatus.textContent = "SIMULATING SPEECH CHANNEL INGEST...";
    this.voiceTranscriptionStatus.style.color = "var(--accent-amber)";
    
    let commandText = "";
    if (type === "eggs") {
      commandText = "Collected twelve eggs today, flock is healthy";
    } else {
      commandText = "Logged twenty pounds of raw milk, goat health perfect";
    }
    
    setTimeout(() => {
      this.voiceTranscribedText.textContent = `"${commandText}"`;
      this.voiceMicPulse.classList.remove("active");
      this.parseVoiceIntent(commandText);
    }, 1200);
  }

  // --- SYSTEM SUBMISSIONS ---
  handleCropSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("crop-name").value;
    const variety = document.getElementById("crop-variety").value;
    const icon = document.getElementById("crop-icon").value;
    const daysToHarvest = parseInt(document.getElementById("crop-days").value, 10);
    const plantedDate = document.getElementById("crop-planted-date").value;

    const newCrop = {
      id: `crop-${Date.now()}`,
      name,
      variety,
      icon,
      plantedDate,
      daysToHarvest,
      lastWatered: new Date().toISOString(),
      notes: "Sown recently. Tracking progress.",
      qtyPlanted: 50,
      estimatedYieldPerQty: 0.5
    };

    this.crops.unshift(newCrop);
    this.addActivity(`Bekah planted a new crop: ${name} (${variety})`, "crop", icon);
    
    this.saveToStorage();
    this.hideModal(this.modalCrop);
    this.formAddCrop.reset();
    this.render();
  }

  handleTaskSubmit(e) {
    e.preventDefault();
    const title = document.getElementById("task-title").value;
    const category = document.getElementById("task-category").value;
    const priority = document.getElementById("task-priority").value;
    const assignee = document.getElementById("task-assignee").value;
    const hours = parseFloat(document.getElementById("task-hours").value);

    const newTask = {
      id: `task-${Date.now()}`,
      title,
      category,
      priority,
      status: "todo",
      assignee,
      hours: isNaN(hours) ? 1.5 : hours
    };

    this.tasks.unshift(newTask);
    this.addActivity(`${assignee} assigned task: "${title}" (${hours} hrs)`, "task", "📝");
    
    this.saveToStorage();
    this.hideModal(this.modalTask);
    this.formAddTask.reset();
    this.render();
  }

  waterCrop(cropId) {
    const crop = this.crops.find(c => c.id === cropId);
    if (crop) {
      crop.lastWatered = new Date().toISOString();
      this.addActivity(`Bekah watered the ${crop.name}`, "crop", crop.icon);
      this.saveToStorage();
      this.render();
    }
  }

  harvestCrop(cropId) {
    const cropIndex = this.crops.findIndex(c => c.id === cropId);
    if (cropIndex !== -1) {
      const crop = this.crops[cropIndex];
      const totalYieldLbs = crop.qtyPlanted * crop.estimatedYieldPerQty;
      const pricePerLb = 4.50;
      const earned = Math.round(totalYieldLbs * pricePerLb);
      
      const dateString = this.currentDate.toISOString().split("T")[0];
      const newTx = {
        id: `tx-${Date.now()}`,
        date: dateString,
        desc: `Harvest Sale: Fulfill ${totalYieldLbs.toFixed(1)} lbs of ${crop.name}`,
        category: "Harvest Sale",
        type: "income",
        amount: earned
      };
      
      this.transactions.unshift(newTx);
      this.addActivity(`Bekah harvested ${totalYieldLbs.toFixed(1)} lbs of ${crop.name} yielding $${earned}!`, "crop", "🌾");
      
      this.crops.splice(cropIndex, 1);
      this.saveToStorage();
      this.render();
    }
  }

  deleteTask(taskId) {
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      const task = this.tasks[taskIndex];
      this.tasks.splice(taskIndex, 1);
      this.addActivity(`Chore deleted: "${task.title}"`, "system", "🗑️");
      this.saveToStorage();
      this.render();
    }
  }

  // --- KANBAN BOARD DRAGS ---
  handleDragStart(e, taskCard) {
    e.dataTransfer.setData("text/plain", taskCard.id);
    taskCard.style.opacity = "0.5";
    setTimeout(() => { taskCard.style.display = "none"; }, 0);
  }

  handleDragEnd(taskCard) {
    taskCard.style.opacity = "1";
    taskCard.style.display = "block";
    document.querySelectorAll(".task-list").forEach(list => { list.style.background = "transparent"; });
  }

  handleDragOver(e, column) {
    e.preventDefault();
    const taskList = column.querySelector(".task-list");
    taskList.style.background = "rgba(255, 255, 255, 0.05)";
    column.style.borderColor = "var(--accent-clay)";
  }

  handleDragLeave(column) {
    const taskList = column.querySelector(".task-list");
    taskList.style.background = "transparent";
    column.style.borderColor = "var(--border-glass)";
  }

  handleDrop(e, column) {
    e.preventDefault();
    const taskList = column.querySelector(".task-list");
    taskList.style.background = "transparent";
    column.style.borderColor = "var(--border-glass)";

    const taskId = e.dataTransfer.getData("text/plain");
    const targetStatus = column.getAttribute("data-status");

    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      const oldStatus = this.tasks[taskIndex].status;
      if (oldStatus !== targetStatus) {
        this.tasks[taskIndex].status = targetStatus;
        const task = this.tasks[taskIndex];
        
        let actionMsg = "";
        if (targetStatus === "done") {
          const duration = task.hours || 1.5;
          const payoutAmount = duration * this.laborRatePerHour;
          
          if (this.memberBalances[task.assignee] !== undefined) {
            this.memberBalances[task.assignee] += payoutAmount;
          } else {
            this.memberBalances[task.assignee] = payoutAmount;
          }

          actionMsg = `${task.assignee} completed chore: "${task.title}" (Paid +$${payoutAmount.toFixed(2)} credits)`;
          this.addActivity(actionMsg, "task", "💸");
        } else if (targetStatus === "doing") {
          actionMsg = `${task.assignee} started chore: "${task.title}"`;
          this.addActivity(actionMsg, "task", "⚙️");
        } else {
          actionMsg = `${task.assignee} moved "${task.title}" back to To Do`;
          this.addActivity(actionMsg, "task", "📝");
        }
        
        this.saveToStorage();
        this.render();
      }
    }
  }

  // ==========================================================================
  // --- INTEGRATED MODULE 1: COMMUNITY STOREFRONT & DYNAMIC YIELD MATCHING ---
  // ==========================================================================
  renderStoreProducts() {
    this.storeProductsGrid.innerHTML = "";

    // T3.2: For each product, ask the cottage-food validator whether the
    // inferred category is prohibited in the operator's state. Surfaces a
    // ⚠ badge + disabled add-to-cart for hard violations so the operator
    // can't list something they aren't legally allowed to sell.
    const cf = window.cgCottageFood;
    const cfReady = cf && cf.ready && this.regionStateCode;

    this.storeProducts.forEach(prod => {
      let perProductWarning = '';
      let isProhibited = false;
      if (cfReady) {
        const cat = cf.inferProductCategory(prod);
        if (cat) {
          const ev = cf.evaluateStorefront({
            stateCode: this.regionStateCode,
            annualRevenueUSD: 0,
            productCategoryCounts: { [cat]: 1 }
          });
          const hard = ev.violations.find(v => v.category === cat);
          if (hard) {
            isProhibited = true;
            perProductWarning =
              `<div class="product-prohibited-badge" title="${this._escapeText(hard.message)}">⚠ Not legal in ${this._escapeText(this.regionStateCode)}</div>`;
          }
        }
      }

      const card = document.createElement("div");
      card.className = "glass-card product-card" + (isProhibited ? " product-prohibited" : "");
      card.innerHTML = `
        <div class="product-emoji-badge">${prod.emoji}</div>
        <div class="product-price-tag">$${prod.price.toFixed(2)}</div>
        <h4 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 4px;">${prod.name}</h4>
        <span class="product-stock">Stock: ${prod.stock} ${prod.stock === 1 ? prod.unit : (prod.unit === 'loaf' ? 'loaves' : prod.unit + 's')} available</span>
        ${perProductWarning}

        <div class="crop-actions" style="border-top: none; padding-top: 0; margin-top: auto;">
          ${isProhibited ? `
            <button class="btn-secondary btn-sm" disabled style="width: 100%; opacity: 0.5; cursor: not-allowed; justify-content: center;" aria-label="${this._escapeText(prod.name)} cannot be sold in your state">
              🚫 Cannot sell here
            </button>
          ` : prod.stock > 0 ? `
            <button class="btn-primary btn-sm" style="width: 100%; justify-content: center;" onclick="app.addToCart('${prod.id}')">
              🛒 Add To Cart
            </button>
          ` : `
            <button class="btn-secondary btn-sm" disabled style="width: 100%; opacity: 0.4; cursor: not-allowed; justify-content: center;">
              Out of Stock
            </button>
          `}
        </div>
      `;
      this.storeProductsGrid.appendChild(card);
    });
  }

  addToCart(prodId) {
    const prod = this.storeProducts.find(p => p.id === prodId);
    if (!prod) return;
    if (this.cart[prodId]) {
      if (this.cart[prodId] < prod.stock) this.cart[prodId]++;
    } else {
      this.cart[prodId] = 1;
    }
    this.renderCart();
  }

  changeCartQty(prodId, delta) {
    if (!this.cart[prodId]) return;
    const prod = this.storeProducts.find(p => p.id === prodId);
    this.cart[prodId] += delta;
    if (this.cart[prodId] <= 0) {
      delete this.cart[prodId];
    } else if (this.cart[prodId] > prod.stock) {
      this.cart[prodId] = prod.stock;
    }
    this.renderCart();
  }

  renderCart() {
    this.cartItemsContainer.innerHTML = "";
    let grandTotal = 0;
    const itemIds = Object.keys(this.cart);

    if (itemIds.length === 0) {
      this.cartItemsContainer.innerHTML = `
        <div class="empty-state" style="padding: 12px; border-style: dotted; margin:0;">
          <p style="font-size: 0.76rem; margin: 0;">Cart is empty. Click store goods to add them.</p>
        </div>
      `;
      this.cartTotalVal.textContent = "$0.00";
      return;
    }

    itemIds.forEach(id => {
      const prod = this.storeProducts.find(p => p.id === id);
      const qty = this.cart[id];
      const itemSubtotal = prod.price * qty;
      grandTotal += itemSubtotal;

      const row = document.createElement("div");
      row.className = "cart-item-row";
      row.innerHTML = `
        <div class="cart-item-info">
          <span style="font-size: 1.15rem;">${prod.emoji}</span>
          <div>
            <div class="cart-item-name">${prod.name}</div>
            <div class="cart-item-meta">$${prod.price.toFixed(2)} / ${prod.unit}</div>
          </div>
        </div>
        
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="cart-qty-control">
            <button class="cart-qty-btn" onclick="app.changeCartQty('${id}', -1)">-</button>
            <span style="font-size: 0.8rem; font-weight: 700; min-width: 12px; text-align: center;">${qty}</span>
            <button class="cart-qty-btn" onclick="app.changeCartQty('${id}', 1)">+</button>
          </div>
          <span style="font-weight: 700; font-size: 0.82rem; min-width: 44px; text-align: right;">
            $${itemSubtotal.toFixed(2)}
          </span>
        </div>
      `;
      this.cartItemsContainer.appendChild(row);
    });

    this.cartTotalVal.textContent = `$${grandTotal.toFixed(2)}`;
    this.renderCottageFoodBanner();
  }

  handleCheckoutCart() {
    const itemIds = Object.keys(this.cart);
    if (itemIds.length === 0) return;

    let subtotal = 0;
    const invoiceRows = [];

    itemIds.forEach(id => {
      const prod = this.storeProducts.find(p => p.id === id);
      const qty = this.cart[id];
      prod.stock -= qty;
      const lineCost = prod.price * qty;
      subtotal += lineCost;

      invoiceRows.push(`
        <tr>
          <td>${prod.emoji} ${prod.name}</td>
          <td>${qty}</td>
          <td>$${prod.price.toFixed(2)}</td>
          <td style="text-align: right; font-weight: 600;">$${lineCost.toFixed(2)}</td>
        </tr>
      `);
    });

    const tax = subtotal * 0.05;
    const total = subtotal + tax;

    const payor = this.checkoutPayor.value;
    let paymentLogDesc = "Storefront Cash Sale (Co-op Invoice)";
    
    if (payor !== "cash") {
      const memberBalance = this.memberBalances[payor] || 0;
      if (memberBalance < total) {
        alert(`Insufficient Co-op Labor Credits! ${payor} has only $${memberBalance.toFixed(2)} credits, but this order is $${total.toFixed(2)}. Choose cash or complete more chores!`);
        itemIds.forEach(id => {
          const prod = this.storeProducts.find(p => p.id === id);
          prod.stock += this.cart[id];
        });
        return;
      }
      this.memberBalances[payor] -= total;
      paymentLogDesc = `Store Checkout: Paid via Co-op Labor Credits (${payor})`;
      this.addActivity(`${payor} paid $${total.toFixed(0)} checkout order using Chore Credits`, "store", "🛒");
    } else {
      this.addActivity(`Co-op Store checkout completed: earned $${total.toFixed(0)}`, "store", "🛒");
    }

    const dateString = this.currentDate.toISOString().split("T")[0];
    const newTx = {
      id: `tx-${Date.now()}`,
      date: dateString,
      desc: paymentLogDesc,
      category: "Storefront",
      type: "income",
      amount: Math.round(total)
    };
    this.transactions.unshift(newTx);

    this.printableInvoiceContent.innerHTML = `
      <div class="invoice-header">
        <div>
          <h2 style="font-family: 'Outfit'; color: var(--accent-sage); font-weight: 800;">CommonGround Co-op</h2>
          <p style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">Locally sourced organic community crops</p>
        </div>
        <div style="text-align: right;">
          <h4 style="font-family: 'Outfit';">RECEIPT</h4>
          <p style="font-size: 0.76rem; color: var(--text-muted);">${dateString}</p>
        </div>
      </div>
      
      <div style="margin-bottom: 16px; font-size: 0.8rem;">
        <span style="color: var(--text-muted); text-transform: uppercase; font-size: 0.68rem;">Payment Source:</span>
        <div style="font-weight: 600; color: var(--text-primary);">${payor === 'cash' ? 'Co-op Cash / Treasury Card' : `${payor} (Labor Payout Ledger)`}</div>
      </div>
      
      <table class="invoice-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Rate</th>
            <th style="text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceRows.join("")}
          <tr>
            <td colspan="2" style="border: none;"></td>
            <td style="color: var(--text-muted); font-size: 0.76rem;">Subtotal:</td>
            <td style="text-align: right; font-weight: 600;">$${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="2" style="border: none;"></td>
            <td style="color: var(--text-muted); font-size: 0.76rem;">Co-op Contribution:</td>
            <td style="text-align: right; font-weight: 600;">$${tax.toFixed(2)}</td>
          </tr>
          <tr class="invoice-total-row">
            <td colspan="2" style="border: none;"></td>
            <td>GRAND TOTAL:</td>
            <td style="text-align: right; font-size: 1.2rem;">$${total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <div class="cg-invoice-disclaimer" style="border-top: 1px dotted var(--border-glass); padding-top: 10px; margin-top: 16px; font-size: 0.68rem; text-align: center; color: var(--text-muted); font-style: italic; line-height: 1.4;">
        ${
          (window.cgCottageFood && window.cgCottageFood.ready
            ? window.cgCottageFood.getInvoiceDisclaimerHTML(this._cottageFoodInput())
            : '<div>⚖️ State-required disclaimer pending (cottage-food rules not loaded yet)</div>')
        }
        ${this.cottageFoodStatement ? `<div style="margin-top:6px;">${this.cottageFoodStatement}</div>` : ''}
      </div>
    `;

    this.cart = {};
    this.saveToStorage();
    this.render();
    this.showModal(this.modalInvoice);
  }

  renderCSAPredictor() {
    this.csaSharesCount.textContent = this.csaShares;
    const promisedMonthlyLbs = this.csaShares * this.csaPromisedWeeklyLbs * 4;
    this.csaPromisedWeight.textContent = `${promisedMonthlyLbs} lbs / mo`;

    let totalPredictedLbs = 0;
    this.crops.forEach(crop => {
      const growth = this.calculateGrowth(crop.plantedDate, crop.daysToHarvest);
      const expectedYield = crop.qtyPlanted * crop.estimatedYieldPerQty;
      const adjustedYield = expectedYield * (growth / 100);
      totalPredictedLbs += adjustedYield;
    });

    const matchPercentage = promisedMonthlyLbs > 0 
      ? Math.min(150, Math.round((totalPredictedLbs / promisedMonthlyLbs) * 100)) 
      : 0;

    this.csaMatchingIndex.textContent = `${matchPercentage}% Match`;
    this.csaMatchingBar.style.width = `${Math.min(100, matchPercentage)}%`;

    const csaCard = document.getElementById("csa-predictor-card");
    const warningContainer = this.csaWarningContainer;
    
    if (matchPercentage >= 100) {
      csaCard.classList.remove("warning");
      this.csaMatchingIndex.style.color = "var(--accent-sage)";
      this.csaMatchingBar.style.background = "linear-gradient(to right, var(--accent-clay), var(--accent-sage))";
      
      warningContainer.innerHTML = `
        <div class="badge badge-sage" style="display: flex; gap: 6px; width: 100%; border-radius: 6px; text-align: left; padding: 8px 12px;">
          <span style="font-weight: 550; font-size: 0.76rem; text-transform: none; letter-spacing: 0;">
            Yield matching is secure! Garden beds yield ${Math.round(totalPredictedLbs)} lbs of maturing vegetables, satisfying all subscribers.
          </span>
        </div>
      `;
    } else {
      csaCard.classList.add("warning");
      this.csaMatchingIndex.style.color = "var(--accent-clay)";
      this.csaMatchingBar.style.background = "linear-gradient(to right, var(--accent-amber), var(--accent-clay))";
      const deficit = promisedMonthlyLbs - Math.round(totalPredictedLbs);
      
      warningContainer.innerHTML = `
        <div class="csa-warning-message" style="display: flex; gap: 6px; flex-direction: column;">
          <strong style="font-size: 0.78rem; color: var(--accent-clay);">Fulfillment Deficit: ${deficit} lbs</strong>
          <p style="font-size: 0.72rem; color: var(--text-secondary); line-height: 1.3;">
            Crops cannot satisfy 10 active CSA contracts. Sow **1 more carrot bed** or **2 spinach packs** to satisfy promised food shares!
          </p>
        </div>
      `;
    }
  }

  // ==========================================================================
  // --- INTEGRATED MODULE 2: HEAVY EQUIPMENT TOOL LIBRARY RENTING ---
  // ==========================================================================
  renderTools() {
    this.toolsGrid.innerHTML = "";
    this.tools.forEach(tool => {
      const card = document.createElement("div");
      card.className = "glass-card tool-card";

      let statusBadgeClass = "status-available";
      let statusText = "Available";
      let actionHtml = `<button class="btn-primary" style="width: 100%; justify-content: center;" onclick="app.openToolCheckoutModal('${tool.id}')">Check Out / Rent</button>`;
      
      if (tool.status === "rented") {
        statusBadgeClass = "status-rented";
        const checked = new Date(tool.checkoutTime);
        const hoursPassed = Math.max(1, Math.round((this.currentDate - checked) / (60 * 60 * 1000)));
        const accruedFees = hoursPassed * tool.hourlyRate;
        
        statusText = `Rented (Accruing $${accruedFees})`;
        actionHtml = `
          <div class="tool-renter-info" style="margin-bottom: 10px; margin-top: 0;">
            <div style="font-weight: 700;">Active Renter: ${tool.renter}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">Duration: ${tool.durationHours} hrs | Accrued: $${accruedFees}</div>
          </div>
          <button class="btn-secondary btn-sm" style="width: 100%; justify-content: center; border-color: var(--accent-amber); color: var(--accent-amber);" onclick="app.checkinTool('${tool.id}')">
            Check In & Accrue Fee
          </button>
        `;
      } else if (tool.status === "maintenance") {
        statusBadgeClass = "status-maintenance";
        statusText = "Maintenance";
        actionHtml = `<button class="btn-secondary" style="width: 100%; justify-content: center; opacity: 0.5;" disabled>🔧 Under Repair</button>`;
      }

      card.innerHTML = `
        <div class="tool-card-header">
          <div class="tool-emoji">${tool.emoji}</div>
          <div class="tool-rate-badge">$${tool.hourlyRate.toFixed(2)}/hr</div>
        </div>
        <h3 class="tool-title">${tool.name}</h3>
        <div style="margin-bottom: 12px;">
          <span class="status-badge ${statusBadgeClass}">
            <span class="status-pulsing-dot"></span>
            ${statusText}
          </span>
        </div>
        <div style="margin-top: auto;">${actionHtml}</div>
        <div class="tool-meta-stats">
          <div>
            <div class="crop-meta-label">Hours Lent</div>
            <div class="tool-meta-value">${tool.totalHoursUsed} hrs</div>
          </div>
          <div>
            <div class="crop-meta-label">Total Earned</div>
            <div class="tool-meta-value" style="color: var(--accent-sage);">$${tool.cumulativeEarnings}</div>
          </div>
        </div>
      `;
      this.toolsGrid.appendChild(card);
    });
    this.statToolsInUse.textContent = this.tools.filter(t => t.status === "rented").length;
  }

  openToolCheckoutModal(toolId) {
    const tool = this.tools.find(t => t.id === toolId);
    if (!tool) return;
    this.checkoutToolId.value = toolId;
    this.checkoutToolName.textContent = tool.name;
    this.checkoutRenterInput.value = "";
    this.checkoutDurationInput.value = 4;
    this.showModal(this.modalToolCheckout);
  }

  handleToolCheckoutSubmit(e) {
    e.preventDefault();
    const toolId = this.checkoutToolId.value;
    const renterName = this.checkoutRenterInput.value;
    const duration = parseInt(this.checkoutDurationInput.value, 10);
    const tool = this.tools.find(t => t.id === toolId);
    
    if (tool) {
      tool.status = "rented";
      tool.renter = renterName;
      tool.checkoutTime = this.currentDate.toISOString();
      tool.durationHours = duration;
      this.addActivity(`${renterName} rented tool: ${tool.name} for ${duration} hrs`, "system", "🔧");
      this.saveToStorage();
      this.hideModal(this.modalToolCheckout);
      this.render();
    }
  }

  checkinTool(toolId) {
    const tool = this.tools.find(t => t.id === toolId);
    if (tool && tool.status === "rented") {
      const checked = new Date(tool.checkoutTime);
      const hoursPassed = Math.max(1, Math.round((this.currentDate - checked) / (60 * 60 * 1000)));
      const accruedFees = hoursPassed * tool.hourlyRate;

      tool.status = "available";
      tool.totalHoursUsed += hoursPassed;
      tool.cumulativeEarnings += accruedFees;
      const renter = tool.renter;
      tool.renter = "";
      tool.checkoutTime = null;
      tool.durationHours = 0;

      const dateString = this.currentDate.toISOString().split("T")[0];
      const newTx = {
        id: `tx-${Date.now()}`,
        date: dateString,
        desc: `Tool Rental Accrued: ${tool.name} checkout (${renter})`,
        category: "Tool Library",
        type: "income",
        amount: accruedFees
      };
      
      this.transactions.unshift(newTx);
      this.addActivity(`${renter} returned ${tool.name} | Accrued $${accruedFees}`, "system", "✅");
      this.saveToStorage();
      this.render();
    }
  }

  // ==========================================================================
  // --- INTEGRATED MODULE 3: DETAILED LEDGER & CO-OP PAYROLL LEDGER ---
  // ==========================================================================
  renderLedgerTransactions() {
    this.ledgerTransactionsBody.innerHTML = "";
    const typeFilter = this.ledgerFilterType.value;
    const searchVal = this.ledgerSearch.value.toLowerCase();

    const filteredTxs = this.transactions.filter(tx => {
      const matchType = typeFilter === "all" || tx.type === typeFilter;
      const matchSearch = tx.desc.toLowerCase().includes(searchVal) || tx.category.toLowerCase().includes(searchVal);
      return matchType && matchSearch;
    });

    if (filteredTxs.length === 0) {
      this.ledgerTransactionsBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">No matching transactions.</td>
        </tr>
      `;
      return;
    }

    filteredTxs.forEach(tx => {
      const row = document.createElement("tr");
      row.className = "transaction-row";
      const formattedAmount = tx.type === "income" ? `+$${tx.amount.toFixed(2)}` : `-$${tx.amount.toFixed(2)}`;
      row.innerHTML = `
        <td>${tx.date}</td>
        <td style="font-weight: 550; color: var(--text-primary);">${tx.desc}</td>
        <td><span class="badge badge-sky" style="font-size: 0.65rem;">${tx.category}</span></td>
        <td><span class="badge ${tx.type === 'income' ? 'badge-sage' : 'badge-clay'}" style="font-size:0.65rem; text-transform: uppercase;">${tx.type}</span></td>
        <td class="transaction-amount ${tx.type}">${formattedAmount}</td>
      `;
      this.ledgerTransactionsBody.appendChild(row);
    });
  }

  renderMilestoneRoad() {
    let totalCash = 0;
    this.transactions.forEach(t => {
      if (t.type === "income") totalCash += t.amount;
      else totalCash -= t.amount;
    });
    this.ledgerCashBalance.textContent = `$${totalCash.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    this.statLedgerBalance.textContent = `$${totalCash.toLocaleString(undefined, {maximumFractionDigits: 0})}`;

    let totalSpeculativeAssets = 0;
    this.crops.forEach(crop => {
      const growth = this.calculateGrowth(crop.plantedDate, crop.daysToHarvest);
      const expectedYield = crop.qtyPlanted * crop.estimatedYieldPerQty;
      const expectedMarketValue = expectedYield * 4.50;
      totalSpeculativeAssets += expectedMarketValue * (growth / 100);
    });
    this.ledgerSpecAssets.textContent = `$${totalSpeculativeAssets.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    const csaMonthlyRevenue = this.csaShares * this.csaRatePerShare;
    this.channelCsaVal.textContent = `$${csaMonthlyRevenue}`;

    let storefrontRevenue = 0;
    this.transactions.forEach(t => {
      if (t.category === "Storefront" && t.type === "income") storefrontRevenue += t.amount;
    });
    this.channelStoreVal.textContent = `$${storefrontRevenue}`;

    let toolsRevenue = 0;
    this.transactions.forEach(t => {
      if (t.category === "Tool Library" && t.type === "income") toolsRevenue += t.amount;
    });
    this.channelToolsVal.textContent = `$${toolsRevenue}`;

    const totalEarnedCurrentMonth = csaMonthlyRevenue + storefrontRevenue + toolsRevenue;
    const progressPercent = Math.min(100, Math.round((totalEarnedCurrentMonth / 10000) * 100));

    this.milestonePercentageVal.textContent = `${progressPercent}%`;
    this.milestoneProgressBar.style.width = `${progressPercent}%`;

    const goalLeft = Math.max(0, 10000 - totalEarnedCurrentMonth);
    this.channelLeftVal.textContent = `$${goalLeft.toLocaleString()}`;

    this.renderMemberPayroll();
  }

  renderMemberPayroll() {
    this.memberPayrollLedger.innerHTML = "";
    Object.keys(this.memberBalances).forEach(member => {
      const bal = this.memberBalances[member];
      const card = document.createElement("div");
      card.className = "member-balance-card";
      card.innerHTML = `
        <div class="assignee-avatar" style="width:36px; height:36px; margin: 0 auto 10px; font-size:1rem; font-weight:700;">
          ${member.substring(0,1).toUpperCase()}
        </div>
        <div style="font-weight: 700; font-size:0.9rem; color: var(--text-primary);">${member}</div>
        <div class="member-balance-val">$${bal.toFixed(2)}</div>
      `;
      this.memberPayrollLedger.appendChild(card);
    });
  }

  disbursePayrollCash() {
    let totalOutstandingCredits = 0;
    Object.keys(this.memberBalances).forEach(member => {
      totalOutstandingCredits += this.memberBalances[member];
    });

    if (totalOutstandingCredits <= 0) {
      alert("No outstanding chore credits found in registry to payout.");
      return;
    }

    let totalCash = 0;
    this.transactions.forEach(t => {
      if (t.type === "income") totalCash += t.amount;
      else totalCash -= t.amount;
    });

    if (totalCash < totalOutstandingCredits) {
      alert(`Co-op treasury has insufficient funds ($${totalCash.toFixed(2)}) to disburse outstanding payroll credits ($${totalOutstandingCredits.toFixed(2)})! Generate more cash storefront sales first.`);
      return;
    }

    const dateString = this.currentDate.toISOString().split("T")[0];
    const payoutTx = {
      id: `tx-${Date.now()}`,
      date: dateString,
      desc: "Co-op Labor Credit Cash Disbursement Payout",
      category: "Payroll Expense",
      type: "expense",
      amount: Math.round(totalOutstandingCredits)
    };
    this.transactions.unshift(payoutTx);

    Object.keys(this.memberBalances).forEach(member => {
      this.memberBalances[member] = 0.00;
    });

    this.addActivity(`Disbursed $${totalOutstandingCredits.toFixed(0)} co-op cash to pay off labor credits`, "system", "💸");
    
    this.saveToStorage();
    this.render();
    alert(`Success! Disbursed $${totalOutstandingCredits.toFixed(2)} co-op cash payouts to Dave, Bekah, Sarah, and Lucas.`);
  }

  // ==========================================================================
  // --- INTEGRATED MODULE 4: LIVESTOCK FLOCK LOGS ---
  // ==========================================================================
  renderLivestock() {
    this.livestockGrid.innerHTML = "";
    this.livestock.forEach(live => {
      const card = document.createElement("div");
      card.className = "glass-card livestock-card";

      if (live.type === "guard") {
        card.innerHTML = `
          <div class="livestock-header">
            <div>
              <h3 style="font-size:1.15rem; font-weight:700;">${live.name}</h3>
              <span class="badge badge-sage" style="margin-top:4px;">${live.qty} Active</span>
            </div>
            <span class="livestock-emoji">${live.emoji}</span>
          </div>

          <div class="livestock-stats-box">
            <div class="livestock-stat-row">
              <span>Health Status</span>
              <span style="font-weight:700; color: var(--accent-sage);">${live.health}</span>
            </div>
            <div class="livestock-stat-row">
              <span>Role</span>
              <span style="font-weight:700; color: var(--text-secondary);">Guardian Predator Deterrent</span>
            </div>
            <div class="livestock-stat-row">
              <span>Security Level</span>
              <span style="font-weight:700; color: var(--accent-clay);">High Active Patrol</span>
            </div>
            <div class="livestock-stat-row">
              <span>Guard Food Supply</span>
              <span style="font-weight:700; color: var(--accent-amber);">${live.feedSupplyLbs} lbs</span>
            </div>
          </div>

          <div style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.4; border-top: 1px solid var(--border-glass); padding-top: 12px; margin-top: auto;">
            <strong>Sector patrol:</strong> ${live.patrolSector || "All Homestead Fields"}. Actively protecting community assets.
          </div>
        `;
      } else {
        let logLabel = "Eggs Collected";
        let inputUnit = "eggs";
        let yieldBtnText = "Collect Yield";
        
        if (live.type === "dairy") {
          logLabel = "Milk Yield (lbs)";
          inputUnit = "lbs";
        }

        const inputId = `harvest-input-${live.id}`;

        card.innerHTML = `
          <div class="livestock-header">
            <div>
              <h3 style="font-size:1.15rem; font-weight:700;">${live.name}</h3>
              <span class="badge badge-sage" style="margin-top:4px;">${live.qty} Active</span>
            </div>
            <span class="livestock-emoji">${live.emoji}</span>
          </div>

          <div class="livestock-stats-box">
            <div class="livestock-stat-row">
              <span>Health Status</span>
              <span style="font-weight:700; color: var(--accent-sage);">${live.health}</span>
            </div>
            <div class="livestock-stat-row">
              <span>Lifetime Production</span>
              <span style="font-weight:700; color: var(--text-secondary);">${live.type === "layers" ? live.eggYieldLifetime : live.milkYieldLifetime} ${inputUnit}</span>
            </div>
            <div class="livestock-stat-row">
              <span>Flock Feed Supply</span>
              <span style="font-weight:700; color: var(--accent-amber);">${live.feedSupplyLbs} lbs</span>
            </div>
          </div>

          <div class="livestock-harvest-form">
            <label style="font-size:0.75rem; font-weight:700; color:var(--text-muted); display:block; margin-bottom:6px;">${logLabel}</label>
            <div style="display:flex; gap:6px; align-items: center;">
              <input type="number" id="${inputId}" class="form-control" min="1" value="12" style="width: 70px; font-size:0.85rem; padding:6px 10px;">
              <button class="btn-primary btn-sm" onclick="app.logLivestockYield('${live.id}')" style="flex-grow: 1; justify-content: center;">
                ${yieldBtnText}
              </button>
              <button type="button" class="icon-btn voice-mic-btn" onclick="app.openVoiceModal('${live.id}')" title="Microphone Voice Log (A11y/Trauma-informed)" style="padding: 8px; border: 1px solid var(--border-glass); border-radius: 6px; background: rgba(0,0,0,0.25); color: var(--accent-sky); display: flex;">
                <svg viewBox="0 0 24 24" style="width: 16px; height: 16px;"><path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/></svg>
              </button>
            </div>
          </div>
        `;
      }
      this.livestockGrid.appendChild(card);
    });
  }

  logLivestockYield(liveId) {
    const live = this.livestock.find(l => l.id === liveId);
    if (!live) return;

    const inputVal = parseInt(document.getElementById(`harvest-input-${liveId}`).value, 10);
    if (isNaN(inputVal) || inputVal <= 0) return;

    let nCompostBonus = 0;

    if (live.type === "layers") {
      live.eggYieldLifetime += inputVal;
      const prod = this.storeProducts.find(p => p.id === "prod-1");
      if (prod) {
        prod.stock += Math.round(inputVal / 12);
      }
      nCompostBonus = Math.round(inputVal * 0.8); // 80% weight manure N conversion
      this.addActivity(`Collected ${inputVal} eggs. Fresh egg catalog stock increased!`, "crop", "🥚");
    } else if (live.type === "dairy") {
      live.milkYieldLifetime += inputVal;
      const earnings = Math.round(inputVal * 2.50);
      const dateString = this.currentDate.toISOString().split("T")[0];
      const milkTx = {
        id: `tx-${Date.now()}`,
        date: dateString,
        desc: `Dairy Sale: ${inputVal} lbs raw goat milk yield`,
        category: "Livestock",
        type: "income",
        amount: earnings
      };
      this.transactions.unshift(milkTx);
      nCompostBonus = Math.round(inputVal * 1.5); // 150% weight manure N conversion
      this.addActivity(`Weighed ${inputVal} lbs fresh milk. Sold milk yield for +$${earnings}!`, "crop", "🥛");
    }

    // F-08: Thermodynamic Compost mineralization curve & Volatilization loss
    if (nCompostBonus > 0 && this.soilInputN) {
      const volatilizationLoss = 0.35; // 35% nitrogen loss during composting
      const netManureN = nCompostBonus * (1 - volatilizationLoss);
      
      const inorganicImmediatelyAvailable = 0.15; // 15% inorganic active N available immediately
      const immediateN = Math.round(netManureN * inorganicImmediatelyAvailable);
      const delayedN = Math.round(netManureN * (1 - inorganicImmediatelyAvailable));
      
      // 1. Release immediate mineralized portion
      const oldN = parseInt(this.soilInputN.value, 10);
      const newN = Math.min(200, oldN + immediateN);
      this.soilInputN.value = newN;
      this.valLabelN.textContent = `${newN} ppm`;
      
      // 2. Queue the remaining organic N portion to mineralize after a delay (30 seconds in simulator)
      const releaseTime = Date.now() + 30000; // 30 seconds
      this.compostQueue.push({
        id: `compost-${Date.now()}`,
        amount: delayedN,
        releaseTime: releaseTime,
        animalType: live.type
      });
      localStorage.setItem("cg_compost_queue", JSON.stringify(this.compostQueue));
      
      this.addActivity(`Composting: Manure applied. +${immediateN} ppm Nitrogen instantly mineralized; +${delayedN} ppm organic Nitrogen queued in composting pile.`, "system", "🧪");
    }

    live.feedSupplyLbs = Math.max(0, live.feedSupplyLbs - Math.round(inputVal * 0.15));

    // T1.1: emit a livestock_logs event into the sync engine outbox so peers
    // see the yield without waiting for the next full refresh. payload mirrors
    // the schema in supabase/migrations/...edge_hardware_and_materialisation.sql
    this._syncRecord('livestock_logs', {
      id:          `lyld-${Date.now()}-${live.id}`,
      animal_ref:  live.id,
      event_type:  'yield',
      payload:     { unit: live.type === 'layers' ? 'egg' : 'lb', count: inputVal },
      recorded_at: new Date().toISOString()
    });

    this.saveToStorage();
    this.render();
  }

  // ==========================================================================
  // --- INTEGRATED MODULE 5: WORKBEE EVENTS & AUTOMATED TASKS INJECTION ---
  // ==========================================================================
  renderEvents() {
    this.workdaysGrid.innerHTML = "";
    this.events.forEach(evt => {
      const card = document.createElement("div");
      card.className = "glass-card event-card";

      card.innerHTML = `
        <div class="event-date-badge">
          <span class="event-date-month">${evt.month}</span>
          <span class="event-date-day">${evt.day}</span>
        </div>
        
        <div class="event-details">
          <h3 class="event-title">${evt.title}</h3>
          <p style="font-size:0.8rem; color: var(--text-secondary); margin-bottom: 6px;">${evt.details}</p>
          
          <div class="event-meta-row">
            <div class="event-meta-item">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
              <span>Award: <strong>${evt.hours} Credits ($${evt.hours * 15})</strong></span>
            </div>
            <div class="event-meta-item">
              <span>Volunteers: <strong>${evt.rsvps} / ${evt.slots} signed up</strong></span>
            </div>
          </div>
        </div>
        
        <div>
          ${evt.rsvps < evt.slots ? `
            <button class="btn-primary" onclick="app.volunteerEvent('${evt.id}')">
              🙌 RSVP & Volunteer
            </button>
          ` : `
            <button class="btn-secondary" style="opacity: 0.5;" disabled>
              Fully Staffed
            </button>
          `}
        </div>
      `;
      this.workdaysGrid.appendChild(card);
    });
  }

  volunteerEvent(evtId) {
    const evt = this.events.find(e => e.id === evtId);
    if (evt && evt.rsvps < evt.slots) {
      evt.rsvps++;
      
      const newChore = {
        id: `task-evt-${Date.now()}`,
        title: `Volunteer workbee: ${evt.title} day chores`,
        category: "gardening",
        priority: "high",
        status: "todo",
        assignee: "Bekah",
        hours: evt.hours
      };
      
      this.tasks.unshift(newChore);
      this.addActivity(`RSVP'd to ${evt.title}. Task added to your board!`, "system", "📅");
      
      this.saveToStorage();
      this.render();
      alert(`Awesome! You RSVP'd for "${evt.title}". A high-priority volunteer chore (worth ${evt.hours} hours = $${evt.hours * 15} credits) has been added to your To Do list!`);
    }
  }

  // ==========================================================================
  // --- INTEGRATED MODULE 6: SEED VAULT CHECKOUTS & SKILL BARTER BOARD ---
  // ==========================================================================
  renderBarterVault() {
    this.seedVaultGrid.innerHTML = "";
    this.seeds.forEach(seed => {
      const card = document.createElement("div");
      card.className = "seed-card";
      card.innerHTML = `
        <span class="seed-emoji">${seed.emoji}</span>
        <h4 style="font-size:0.8rem; font-weight:700; color:var(--text-primary);">${seed.name}</h4>
        <span class="seed-qty-badge">${seed.packets} packs available</span>
        
        <div>
          ${seed.packets > 0 ? `
            <button class="btn-secondary btn-sm" style="width:100%;" onclick="app.borrowSeed('${seed.id}')">
              🌱 Take Pack
            </button>
          ` : `
            <button class="btn-secondary btn-sm" disabled style="width:100%; opacity:0.4;">Empty</button>
          `}
        </div>
      `;
      this.seedVaultGrid.appendChild(card);
    });

    this.barterBoardList.innerHTML = "";
    this.barters.forEach(b => {
      const card = document.createElement("div");
      card.className = "glass-card barter-card";
      card.innerHTML = `
        <div class="barter-card-header">
          <span>Co-op Peer Swap</span>
          <span style="font-weight:700; color:var(--accent-sky);">${b.member}</span>
        </div>
        
        <div class="barter-text-block">
          <strong style="color: var(--accent-sage);">OFFERS:</strong> ${b.offer}
        </div>
        <div class="barter-text-block" style="border-color: hsla(18,76%,56%,0.2);">
          <strong style="color: var(--accent-clay);">SEEKS:</strong> ${b.seek}
        </div>
      `;
      this.barterBoardList.appendChild(card);
    });
  }

  borrowSeed(seedId) {
    const seed = this.seeds.find(s => s.id === seedId);
    if (seed && seed.packets > 0) {
      seed.packets--;
      seed.checkedOut++;
      this.addActivity(`Checked out 1 packet of ${seed.name} from seed vault`, "system", "🌱");
      this.saveToStorage();
      this.render();
    }
  }

  // ==========================================================================
  // --- INTEGRATED MODULE 7: COMMUNAL UTILITY & RESERVE PLOTS DIALS ---
  // ==========================================================================
  renderUtilityGrid() {
    const capacity = 10000;
    const currentWater = this.cisternWater;
    const waterPercent = Math.round((currentWater / capacity) * 100);
    this.waterTankVal.textContent = currentWater.toLocaleString();
    
    const rotationDeg = -45 + (waterPercent / 100 * 360);
    this.waterDialFill.style.transform = `rotate(${rotationDeg}deg)`;
    
    this.solarBatteryPercentage.textContent = `${this.solarBattery}% Charged`;
    
    const solarGridStatus = document.getElementById("solar-grid-status");
    if (this.solarBattery > 80) {
      solarGridStatus.innerHTML = `<span>Sunny skies. Batteries fully charged. (+5.1 kW)</span>`;
    } else if (this.solarBattery > 40) {
      solarGridStatus.innerHTML = `<span>Partly cloudy. Inverter charging batteries (+2.4 kW)</span>`;
    } else {
      solarGridStatus.innerHTML = `<span style="color: var(--accent-clay);">Overcast afternoon. Drawing reserve power (-1.8 kW)</span>`;
    }

    this.solarBatteryGrid.innerHTML = "";
    const activeCells = Math.round(this.solarBattery / 10);
    
    for (let i = 1; i <= 10; i++) {
      const cell = document.createElement("div");
      cell.className = "battery-cell";
      if (i <= activeCells) {
        cell.classList.add("filled");
      }
      this.solarBatteryGrid.appendChild(cell);
    }

    this.plotsGridContainer.innerHTML = "";
    this.plots.forEach(plot => {
      const cell = document.createElement("div");
      cell.className = "plot-cell";
      if (plot.reserved) {
        cell.classList.add("reserved");
        cell.textContent = plot.label;
      } else {
        cell.textContent = "VACANT";
      }

      cell.addEventListener("click", () => {
        plot.reserved = !plot.reserved;
        
        let logMsg = "";
        if (plot.reserved) {
          logMsg = `Bekah reserved Communal Field Bed plot: ${plot.label}`;
        } else {
          logMsg = `Bekah released reservation on plot: ${plot.label}`;
        }
        this.addActivity(logMsg, "system", "🗺️");
        
        this.saveToStorage();
        this.render();
      });

      this.plotsGridContainer.appendChild(cell);
    });
  }

  activateUtilityPulse() {
    setInterval(() => {
      const batteryShift = Math.random() > 0.5 ? 1 : -1;
      this.solarBattery = Math.min(100, Math.max(10, this.solarBattery + batteryShift));
      
      const waterShift = Math.random() > 0.6 ? 10 : -10;
      this.cisternWater = Math.min(10000, Math.max(2000, this.cisternWater + waterShift));

      // Increment LoRa telemetry gateway packets
      this.loraPacketsCount += Math.floor(Math.random() * 5) + 1;
      if (this.loraPackets) {
        this.loraPackets.textContent = `${this.loraPacketsCount.toLocaleString()} packets`;
      }
      if (this.loraRssi) {
        const rssiVal = -80 - Math.floor(Math.random() * 12);
        this.loraRssi.textContent = `${rssiVal} dBm (${rssiVal > -85 ? 'Strong' : 'Stable'})`;
      }
      
      // Feed live logs into console
      if (this.loraGatewayConsole) {
        const logs = [
          `[NODE-S01] Soil telemetry sync: optimal moisture (42%)`,
          `[NODE-S02] Soil telemetry sync: dry conditions (24%)`,
          `[NODE-W03] Cistern capacity sensor: ${this.cisternWater} Gallons`,
          `[NODE-P04] Solar battery status: ${this.solarBattery}% reserve`,
          `[GATEWAY] Uplink synced, packet dispatched (+${Math.floor(Math.random() * 3) + 1})`
        ];
        const randomLog = logs[Math.floor(Math.random() * logs.length)];
        
        const logLine = document.createElement("div");
        logLine.textContent = `[${new Date().toLocaleTimeString()}] ${randomLog}`;
        this.loraGatewayConsole.appendChild(logLine);
        
        // Cap lines at 6 to avoid visual scrolling clutter
        if (this.loraGatewayConsole.children.length > 6) {
          this.loraGatewayConsole.removeChild(this.loraGatewayConsole.firstChild);
        }
        this.loraGatewayConsole.scrollTop = this.loraGatewayConsole.scrollHeight;
      }
      
      // Increment rest days and vegetation heights for recovering paddocks
      this.paddocks.forEach(p => {
        if (p.status === "recovering") {
          p.restDays = Math.min(30, p.restDays + 1);
          if (p.restDays >= 30) {
            p.status = "ready";
            this.addActivity(`Pasture Alert: ${p.name} is now fully rested and ready to graze!`, "system", "🌾");
          }
          p.height = Math.min(12, +(p.height + 0.2).toFixed(1));
        } else if (p.status === "grazing") {
          p.height = Math.max(1, +(p.height - 0.1).toFixed(1));
        }
      });
      
      // F-08: Check biological composting queue for mineralized nitrogen releases
      // ECO-4: First-order biological decay equation scaled by temperature (Q10 = 2)
      const temp = this.solarBattery < 40 ? 38 : 65; // Fahrenheit temperature matching our dynamic climate
      const q10 = 2.0;
      const tRef = 68.0; // Reference temperature (Fahrenheit)
      const kBase = 0.05; // 5% base decay rate per 10-second step at 68F
      
      const fTemp = Math.pow(q10, (temp - tRef) / 18.0);
      const k = kBase * fTemp;
      
      let queueChanged = false;
      
      this.compostQueue = this.compostQueue.map(item => {
        if (item.amount > 0) {
          const released = Math.min(item.amount, Math.max(1, Math.round(item.amount * k)));
          item.amount -= released;
          
          if (this.soilInputN) {
            const oldN = parseInt(this.soilInputN.value, 10);
            const newN = Math.min(200, oldN + released);
            this.soilInputN.value = newN;
            this.valLabelN.textContent = `${newN} ppm`;
            this.addActivity(`Composting: Compost pile mineralizing, releasing +${released} ppm plant-available Nitrogen into soil (${item.amount} ppm organic N remaining).`, "system", "🧪");
          }
          queueChanged = true;
        }
        return item;
      }).filter(item => item.amount > 0);
      
      if (queueChanged) {
        localStorage.setItem("cg_compost_queue", JSON.stringify(this.compostQueue));
        this.render();
      }
      
      this.saveToStorage();
      this.renderUtilityGrid();
    }, 10000);
  }

  // ==========================================================================
  // --- NEW ENGINE DYNAMIC FEATURE LOCKING (Tiers Control) ---
  // ==========================================================================
  applyDynamicFeatureLocking() {
    // Remove any pre-existing lock overlays first to prevent layout stack bugs
    document.querySelectorAll(".tier-locked-overlay").forEach(overlay => overlay.remove());

    // All co-op tabs that can be locked under free/basic pricing structure
    const allCoopTabs = ["tasks-tab", "store-tab", "tools-tab", "ledger-tab", "workdays-tab", "barter-tab", "resources-tab"];

    if (this.pricingTier === "pro") {
      if (this.addonsContainer) {
        this.addonsContainer.style.display = "none";
      }
      return; // All systems active under Pro
    }

    // Free/Basic: show addons container
    if (this.addonsContainer) {
      this.addonsContainer.style.display = "flex";
      this.addonStorefrontCheckbox.checked = this.addonStorefront;
      this.addonIotCheckbox.checked = this.addonIot;
    }

    allCoopTabs.forEach(tabId => {
      // Determine if this tab is unlocked by an active add-on
      let isUnlocked = false;
      if (tabId === "store-tab" && this.addonStorefront) {
        isUnlocked = true;
      }
      if (tabId === "resources-tab" && this.addonIot) {
        isUnlocked = true;
      }

      if (isUnlocked) {
        return; // Skip locking if this tab is unlocked by an add-on!
      }

      const tabEl = document.getElementById(tabId);
      if (!tabEl) return;

      const overlay = document.createElement("div");
      overlay.className = "tier-locked-overlay";
      
      let lockHeader = "Pro / Co-op Feature Locked";
      let lockDesc = "";
      let lockButtonsHtml = "";

      if (tabId === "store-tab") {
        lockHeader = "Storefront & CSA Sales Locked";
        lockDesc = "This storefront manages member CSA crop distributions, custom cottage food safety statements, and public commerce receipts. Unlocking direct produce sales requires either the standalone **Storefront Add-on** or upgrading to the full **Pro Bundle**.";
        lockButtonsHtml = `
          <button class="btn-primary" onclick="app.upgradeSoftwareTier()" style="width: 100%; justify-content: center; margin-bottom: 8px; background: var(--accent-sage);">
            Upgrade to Pro Bundle ($39/mo) — Best Value!
          </button>
          <button class="btn-secondary" onclick="app.purchaseAddon('storefront')" style="width: 100%; justify-content: center; border: 1px solid var(--border-glass);">
            Unlock Storefront Add-on ($29/mo)
          </button>
        `;
      } else if (tabId === "resources-tab") {
        lockHeader = "Smart IoT & Resource Grid Locked";
        lockDesc = "This utility grid runs active LoRaWAN wireless IoT hardware gateway logs and schedules cistern water/solar grid reserves. Unlocking wireless gateway telemetry requires either the standalone **IoT Smart Grid Add-on** or upgrading to the full **Pro Bundle**.";
        lockButtonsHtml = `
          <button class="btn-primary" onclick="app.upgradeSoftwareTier()" style="width: 100%; justify-content: center; margin-bottom: 8px; background: var(--accent-sage);">
            Upgrade to Pro Bundle ($39/mo) — Best Value!
          </button>
          <button class="btn-secondary" onclick="app.purchaseAddon('iot')" style="width: 100%; justify-content: center; border: 1px solid var(--border-glass);">
            Unlock IoT Smart Grid ($19/mo)
          </button>
        `;
      } else {
        // Shared Co-op Features (Tasks, Tools, Ledger, Workdays, Barter)
        let featureName = "Cooperative System Module";
        if (tabId === "tasks-tab") featureName = "Co-op Chore & Labor Payroll Board";
        else if (tabId === "tools-tab") featureName = "Shared Tool Library reservation tracker";
        else if (tabId === "ledger-tab") featureName = "Path to $10k/Month Co-op Treasury Ledger";
        else if (tabId === "workdays-tab") featureName = "Co-op Barn-Raising Workday Scheduler";
        else if (tabId === "barter-tab") featureName = "Seed Vault & Skill Barter Registry";

        lockHeader = `${featureName} Locked`;
        lockDesc = "These advanced features coordinate multiple members across community farms, shared tool pools, and work payroll credits. Individual free plans include single-farmer planner tools, while co-op group coordination requires the Pro plan.";
        lockButtonsHtml = `
          <button class="btn-primary" onclick="app.upgradeSoftwareTier()" style="width: 100%; justify-content: center; background: var(--accent-sage);">
            Upgrade to Pro Bundle ($39/mo) — All Features Unlocked!
          </button>
        `;
      }

      // Inject locked promotional card overlay
      overlay.innerHTML = `
        <div class="lock-card-box" role="alert" aria-live="assertive">
          <div class="lock-icon-glow">
            <svg viewBox="0 0 24 24"><path d="M18,8H17V6A5,5 0 0,0 12,1A5,5 0 0,0 7,6V8H6A2,2 0 0,0 4,10V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V10A2,2 0 0,0 18,8M8.9,6C8.9,4.29 10.3,2.9 12,2.9C13.7,2.9 15.1,4.29 15.1,6V8H8.9V6M18,20H6V10H18V20M12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17A2,2 0 0,0 14,15A2,2 0 0,0 12,13Z"/></svg>
          </div>
          <h3 style="font-family:'Outfit'; font-size: 1.25rem; margin-bottom: 8px;">${lockHeader}</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px; line-height: 1.4;">
            ${lockDesc}
          </p>
          <div style="display: flex; flex-direction: column; width: 100%;">
            ${lockButtonsHtml}
          </div>
        </div>
      `;
      
      tabEl.appendChild(overlay);
    });
  }

  // --- SYSTEM GLOBAL BOOTSTRAP ---
  render() {
    this.renderMetrics();
    this.renderActivityLog();
    this.renderUrgentAlerts();
    this.renderCrops();
    this.renderTasks();

    this.renderStoreProducts();
    this.renderCart();
    this.renderCSAPredictor();
    this.renderTools();
    this.renderMilestoneRoad();
    this.renderLedgerTransactions();

    this.renderLivestock();
    this.renderPaddocks();
    this.renderEvents();
    this.renderBarterVault();
    this.renderUtilityGrid();

    // Trigger tier locks
    this.applyDynamicFeatureLocking();
  }

  renderMetrics() {
    this.statActiveCrops.textContent = this.crops.length;
    this.statPendingTasks.textContent = this.tasks.filter(t => t.status !== "done").length;
  }

  renderActivityLog() {
    this.activityFeedContainer.innerHTML = "";
    if (this.activities.length === 0) {
      this.activityFeedContainer.innerHTML = `<div class="empty-state">No recent activities log.</div>`;
      return;
    }
    this.activities.forEach(act => {
      const item = document.createElement("div");
      item.className = "feed-item";
      item.innerHTML = `
        <div class="feed-item-icon ${act.type}">
          <span style="font-size: 1.15rem;">${act.icon || "🌱"}</span>
        </div>
        <div class="feed-item-content">
          <div class="feed-item-title">${act.text}</div>
          <div class="feed-item-time">${act.time}</div>
        </div>
      `;
      this.activityFeedContainer.appendChild(item);
    });
  }

  renderUrgentAlerts() {
    this.urgentAlertsContainer.innerHTML = "";
    const urgentItems = this.tasks.filter(t => t.priority === "high" && t.status !== "done");

    if (urgentItems.length === 0) {
      this.urgentAlertsContainer.innerHTML = `
        <div class="alert-box" style="background: hsla(142, 50%, 50%, 0.08); border-color: hsla(142, 50%, 50%, 0.2);">
          <svg viewBox="0 0 24 24" style="fill: var(--accent-sage); width:20px; height:20px;" aria-hidden="true"><path d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M10,17L5,12L6.41,10.59L10,14.17L17.59,6.58L19,8L10,17Z"/></svg>
          <div class="alert-box-text" style="color: var(--text-primary); font-size: 0.82rem;">All urgent chores completed! You're fully caught up.</div>
        </div>
      `;
      return;
    }

    urgentItems.slice(0, 3).forEach(task => {
      const card = document.createElement("div");
      card.className = "alert-box";
      card.style.cursor = "pointer";
      card.addEventListener("click", () => {
        this.switchTab("tasks");
      });

      card.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M11,16H13V18H11V16M11,6H13V14H11V6Z"/></svg>
        <div class="alert-box-text" style="font-size: 0.82rem;">
          <strong>${task.assignee}</strong>: "${task.title}"
        </div>
      `;
      this.urgentAlertsContainer.appendChild(card);
    });
  }

  renderCrops() {
    this.cropsGrid.innerHTML = "";
    const searchVal = this.cropSearch.value.toLowerCase();
    
    const filteredCrops = this.crops.filter(c => 
      c.name.toLowerCase().includes(searchVal) || 
      c.variety.toLowerCase().includes(searchVal)
    );

    if (filteredCrops.length === 0) {
      this.cropsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.28,3L1,4.27L3.22,6.5C3.07,7.1 3,7.74 3,8.42C3,12 5.96,15 9.58,15.18L11,16.6V20H13V16.6L19.73,23.33L21,22.06L2.28,3M5,8.42C5,7.9 5.08,7.4 5.22,6.92L11.72,13.42C10.59,13.22 9.75,12.28 9.58,11.1C9.58,10.6 9.42,10.1 9.08,9.75C8.75,9.4 8.25,9.25 7.75,9.25C6.23,9.25 5,8.88 5,8.42M14.5,12.5C14.73,12.5 15,12.4 15.2,12.25L17.75,14.8C16.94,15.5 15.93,16 14.8,16.25V20H16.8V22H11.2V20H13.2V16.25C13.4,16.2 13.6,16.15 13.8,16.1L11.2,13.5C12,13 13,12.75 14.05,12.75C14.2,12.75 14.35,12.6 14.5,12.5M12,1.1C16.4,1.1 20,4.7 20,9.1C20,11.5 18.9,13.6 17.2,15.1L15.8,13.7C17.2,12.6 18,10.9 18,9.1A6,6 0 0,0 12,3.1C11,3.1 10,3.3 9.1,3.8L7.6,2.3C8.9,1.5 10.4,1.1 12,1.1Z"/></svg>
          <p>No active crops match your search.</p>
        </div>
      `;
      return;
    }

    filteredCrops.forEach(crop => {
      const growth = this.calculateGrowth(crop.plantedDate, crop.daysToHarvest);
      const daysLeft = this.calculateDaysRemaining(crop.plantedDate, crop.daysToHarvest);
      
      const card = document.createElement("div");
      card.className = "glass-card crop-card";

      card.innerHTML = `
        <div class="crop-card-header">
          <div class="crop-title-group">
            <h3 style="font-size: 1.15rem;">${crop.name}</h3>
            <span class="crop-variety">${crop.variety}</span>
          </div>
          <div class="crop-visual-indicator">${crop.icon}</div>
        </div>

        <div class="growth-progress-container">
          <div class="growth-progress-labels">
            <span>Growth Stage</span>
            <span style="font-weight:700; color: var(--accent-sage);">${growth}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${growth}%;"></div>
          </div>
        </div>

        <div class="crop-meta-grid">
          <div class="crop-meta-item">
            <span class="crop-meta-label">Planted</span>
            <span class="crop-meta-value" style="font-size: 0.8rem;">${crop.plantedDate}</span>
          </div>
          <div class="crop-meta-item">
            <span class="crop-meta-label">Yield Metric</span>
            <span class="crop-meta-value" style="font-size: 0.8rem;">${crop.qtyPlanted} plants</span>
          </div>
          <div class="crop-meta-item">
            <span class="crop-meta-label">Watered</span>
            <span class="crop-meta-value" style="font-size: 0.8rem;">${this.formatLastWatered(crop.lastWatered)}</span>
          </div>
          <div class="crop-meta-item">
            <span class="crop-meta-label">Status</span>
            <span class="crop-meta-value" style="font-size: 0.8rem; font-weight: 700; color: ${growth >= 100 ? 'var(--accent-sage)' : 'var(--text-secondary)'}">
              ${growth >= 100 ? 'Harvest Ready! 🌾' : `${daysLeft} Days Left`}
            </span>
          </div>
        </div>

        ${this.isCropInFrostDanger(crop) ? `
          <div class="usda-frost-warning" role="alert">
            <span>⚠️ USDA Zone ${this.usdaZone} Frost danger window is currently active! Install crop cover blankets.</span>
          </div>
        ` : ''}

        <div class="crop-actions">
          <button class="btn-secondary btn-sm" onclick="app.waterCrop('${crop.id}')">
            💧 Water
          </button>
          ${growth >= 100 ? `
            <button class="btn-primary btn-sm" onclick="app.harvestCrop('${crop.id}')" style="background: var(--accent-sage);">
              🌾 Harvest
            </button>
          ` : `
            <button class="btn-secondary btn-sm" disabled style="opacity: 0.4; cursor: not-allowed;">
              🌾 Wait
            </button>
          `}
        </div>
      `;
      this.cropsGrid.appendChild(card);
    });
  }

  renderTasks() {
    this.listTodo.innerHTML = "";
    this.listDoing.innerHTML = "";
    this.listDone.innerHTML = "";

    const catFilter = this.taskFilterCategory.value;
    const priFilter = this.taskFilterPriority.value;

    const filteredTasks = this.tasks.filter(t => {
      const matchCat = catFilter === "all" || t.category === catFilter;
      const matchPri = priFilter === "all" || t.priority === priFilter;
      return matchCat && matchPri;
    });

    filteredTasks.forEach(task => {
      const card = document.createElement("div");
      card.className = "glass-card task-card";
      card.id = task.id;
      card.draggable = true;

      card.addEventListener("dragstart", (e) => this.handleDragStart(e, card));
      card.addEventListener("dragend", () => this.handleDragEnd(card));

      let catLabel = "General";
      let catBadge = "badge-sky";
      if (task.category === "gardening") { catLabel = "Gardening & Land"; catBadge = "badge-sage"; }
      else if (task.category === "animals") { catLabel = "Livestock & Feed"; catBadge = "badge-amber"; }
      else if (task.category === "building") { catLabel = "Building & Repairs"; catBadge = "badge-clay"; }

      card.innerHTML = `
        <div class="task-priority-indicator priority-${task.priority}"></div>
        <div class="task-card-header">
          <span class="badge ${catBadge}">${catLabel}</span>
          <span class="badge badge-${task.priority}" style="font-size: 0.65rem; text-transform: uppercase;">${task.priority}</span>
        </div>
        <h4 style="font-size: 0.95rem; font-weight: 600; line-height: 1.4; margin-bottom: 12px;">${task.title}</h4>
        
        <div class="task-card-footer">
          <div class="task-assignee">
            <div class="assignee-avatar">${task.assignee.substring(0, 1).toUpperCase()}</div>
            <span>${task.assignee}</span>
          </div>
          <button class="icon-btn" onclick="app.deleteTask('${task.id}')" title="Delete chore">
            <svg viewBox="0 0 24 24" style="width: 14px; height: 14px;"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>
          </button>
        </div>
      `;

      if (task.status === "todo") this.listTodo.appendChild(card);
      else if (task.status === "doing") this.listDoing.appendChild(card);
      else if (task.status === "done") this.listDone.appendChild(card);
    });

    this.countTodo.textContent = this.listTodo.children.length;
    this.countDoing.textContent = this.listDoing.children.length;
    this.countDone.textContent = this.listDone.children.length;

    this.checkEmptyColumns();
  }

  checkEmptyColumns() {
    const cols = [
      { el: this.listTodo, label: "To Do" },
      { el: this.listDoing, label: "In Progress" },
      { el: this.listDone, label: "Completed" }
    ];

    cols.forEach(c => {
      if (c.el.children.length === 0) {
        c.el.innerHTML = `
          <div class="empty-state" style="border-style: dotted; padding: 20px; min-height: 120px; margin:0;">
            <p style="font-size: 0.76rem; margin: 0;">Drag chores here, or assign a new task.</p>
          </div>
        `;
      }
    });
  }

  calculateGrowth(plantedDateStr, daysToHarvest) {
    const planted = new Date(plantedDateStr);
    const harvestDate = new Date(planted.getTime() + daysToHarvest * 24 * 60 * 60 * 1000);
    const total = harvestDate - planted;
    const elapsed = this.currentDate - planted;
    if (total <= 0) return 100;
    const percent = Math.round((elapsed / total) * 100);
    return Math.max(0, Math.min(100, percent));
  }

  calculateDaysRemaining(plantedDateStr, daysToHarvest) {
    const planted = new Date(plantedDateStr);
    const harvestDate = new Date(planted.getTime() + daysToHarvest * 24 * 60 * 60 * 1000);
    const diffTime = harvestDate - this.currentDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  formatLastWatered(lastWateredStr) {
    if (!lastWateredStr) return "Never";
    const watered = new Date(lastWateredStr);
    const diffMs = this.currentDate - watered;
    if (diffMs < 0) return "Just now";
    const diffMins = Math.round(diffMs / (60 * 1000));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.round(diffMs / (60 * 60 * 1000));
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
    if (diffDays === 1) return "Yesterday";
    return `${diffDays}d ago`;
  }

  // ==========================================================================
  // --- INTEGRATED MODULE 8: AI PLANT DIAGNOSTICS & SPACE BLUEPRINTING ---
  // ==========================================================================
  
  // 1. Camera stream controller
  async toggleCameraStream() {
    if (this.webcamStream) {
      // Stop active stream
      if (this.webcamStream !== "simulated") {
        this.webcamStream.getTracks().forEach(track => track.stop());
      }
      this.webcamStream = null;
      this.webcamFeed.srcObject = null;
      this.webcamFeed.style.display = "none";
      
      this.btnToggleCamera.textContent = "🎥 Start Live Camera Feed";
      this.btnToggleCamera.style.background = "var(--accent-sage)";
      this.scannerStatus.textContent = "Gemini Plant Vision: IDLE";
      this.scannerStatus.style.color = "var(--accent-sage)";
      this.scannerStatus.style.textShadow = "0 0 4px var(--accent-sage)";
      this.scanLine.classList.remove("scanning");
      this.cameraSimFrame.style.backgroundImage = "none";
      this.addActivity("Bekah closed plant vision camera feed", "system", "📷");
    } else {
      try {
        this.scannerStatus.textContent = "ACCESSING WEB CAMERA...";
        const constraints = { video: { facingMode: "environment" } };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        this.webcamStream = stream;
        this.webcamFeed.srcObject = stream;
        this.webcamFeed.style.display = "block";
        this.webcamFeed.style.width = "100%";
        this.webcamFeed.style.height = "100%";
        this.webcamFeed.style.objectFit = "cover";
        
        this.btnToggleCamera.textContent = "❌ Stop Camera Feed";
        this.btnToggleCamera.style.background = "var(--accent-clay)";
        this.scannerStatus.textContent = "Gemini Plant Vision: ACTIVE - LIVE FEED";
        this.scannerStatus.style.color = "var(--accent-sage)";
        this.scanLine.classList.add("scanning");
        this.addActivity("Bekah opened plant vision live camera stream", "system", "📷");
      } catch (err) {
        console.warn("Camera stream access blocked or unavailable, enabling high-fidelity viewport simulation.", err);
        // Fallback simulated camera experience
        this.scannerStatus.textContent = "Gemini Plant Vision: SIMULATED CAMERA ACTIVE";
        this.scannerStatus.style.color = "var(--accent-amber)";
        this.scannerStatus.style.textShadow = "0 0 4px var(--accent-amber)";
        this.scanLine.classList.add("scanning");
        
        // Draw simulated leaf background
        this.cameraSimFrame.style.backgroundImage = "linear-gradient(135deg, #1d401e 0%, #305f32 100%)";
        
        this.btnToggleCamera.textContent = "❌ Close Viewport Simulation";
        this.btnToggleCamera.style.background = "var(--accent-clay)";
        this.webcamStream = "simulated";
        this.addActivity("Bekah enabled plant vision camera simulation feed", "system", "📷");
      }
    }
  }

  // 2. Photo uploads emulations
  handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      // Draw uploaded leaf photo inside previewer
      this.cameraSimFrame.style.backgroundImage = `url('${event.target.result}')`;
      this.scannerStatus.textContent = `IMAGE CHARGED: ${file.name.toUpperCase()} - READY TO SCAN`;
      this.scannerStatus.style.color = "var(--accent-sky)";
      this.scannerStatus.style.textShadow = "0 0 4px var(--accent-sky)";
      this.scanLine.classList.add("scanning");
      this.addActivity(`Bekah uploaded specimen image for AI scan: ${file.name}`, "system", "📤");
    };
    reader.readAsDataURL(file);
  }

  // 3. Simulated Plant scanning sweeps
  runSimulatedScan() {
    const diseaseKey = this.mockDiseaseSelector.value;
    const disease = DIAGNOSIS_DATABASE[diseaseKey];
    if (!disease) return;

    // Start scanning sweeping animations
    this.scanLine.classList.add("scanning");
    this.scannerStatus.textContent = "GEMINI plant vision: DEEP AI ANALYSIS SCANNING...";
    this.scannerStatus.style.color = "var(--accent-amber)";
    this.scannerStatus.style.textShadow = "0 0 4px var(--accent-amber)";
    this.btnRunSimulationScan.disabled = true;
    this.btnRunSimulationScan.textContent = "⚡ Analysing leaf patterns...";

    setTimeout(() => {
      // 1. Camera snap visual flash
      this.cameraFlash.classList.add("flash");
      setTimeout(() => this.cameraFlash.classList.remove("flash"), 400);

      // 2. Draw mock leaf graphics on viewport representing the disease visually (avoids placeholders)
      this.cameraSimFrame.style.backgroundImage = disease.indicatorStyle;

      // 3. Reset scanning states
      this.scanLine.classList.remove("scanning");
      this.scannerStatus.textContent = `SCAN COMPLETE: ${disease.name.toUpperCase()} IDENTIFIED`;
      this.scannerStatus.style.color = "var(--accent-sage)";
      this.scannerStatus.style.textShadow = "0 0 4px var(--accent-sage)";
      
      this.btnRunSimulationScan.disabled = false;
      this.btnRunSimulationScan.textContent = "⚡ Rescan Specimen";

      // 4. Populate diagnostics output card
      this.activeDiagnosis = disease;
      this.diagDiseaseName.textContent = disease.name;
      this.diagConfidenceBadge.textContent = `${disease.confidence} MATCH`;
      this.diagClass.textContent = disease.classification;
      this.diagDescription.innerHTML = `<strong>Diagnostic Summary:</strong> ${disease.description}`;
      
      // Clear symptoms list and append dynamically
      this.diagSymptoms.innerHTML = "";
      disease.symptoms.forEach(s => {
        const li = document.createElement("li");
        li.textContent = s;
        this.diagSymptoms.appendChild(li);
      });

      this.diagRemedy.textContent = disease.remedy;

      // Unveil details panel beautifully
      this.diagnosticResultsPanel.style.display = "block";
      this.diagnosticResultsPanel.scrollIntoView({ behavior: 'smooth' });

      // Log event
      this.addActivity(`AI Diagnosis: ${disease.name} identified with ${disease.confidence} confidence`, "system", "👁️");
    }, 2000);
  }

  // 4. Remedy Chore Injection to Kanban Board
  injectRemedyTask() {
    const disease = this.activeDiagnosis;
    if (!disease) return;

    // Create custom chore
    const newTask = {
      id: `task-remedy-${Date.now()}`,
      title: `Remedy chore: ${disease.remedyChore}`,
      category: disease.remedyCategory,
      priority: "high",
      status: "todo",
      assignee: "Bekah",
      hours: disease.remedyHours
    };

    this.tasks.unshift(newTask);
    const payoutStr = (disease.remedyHours * this.laborRatePerHour).toFixed(2);
    this.addActivity(`Remedial chore assigned: "${disease.remedyChore}" (Paid +$${payoutStr} credits)`, "task", "📝");
    
    this.saveToStorage();
    this.render();

    alert(`Success! A high-priority remedial chore worth ${disease.remedyHours} hours ($${payoutStr} credits) has been assigned to your Task Board to resolve the ${disease.name}.`);
    
    // Automatically switch to tab tasks so the user sees it immediately
    this.switchTab("tasks");
  }

  // 5. Space Blueprint submit layout calculation
  handleBlueprintSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("blueprint-name").value;
    const width = parseInt(document.getElementById("blueprint-width").value, 10);
    const length = parseInt(document.getElementById("blueprint-length").value, 10);
    const sun = document.getElementById("blueprint-sun").value;
    const soil = document.getElementById("blueprint-soil").value;
    const goal = document.getElementById("blueprint-goal").value;

    this.activeBlueprint = { name, width, length, sun, soil, goal };

    // Calculate plantings and innovations based on selected goal
    let plants = "";
    let innovations = [];
    
    if (goal === "market") {
      plants = "Roma Heirloom Tomatoes, Sweet Onions, Savoy Spinach, Rainbow Carrots (Linear succession planting rows)";
      innovations = [
        "Inline Automated Solar Drip Irrigation lines",
        "Soil moisture LoRa wireless monitoring nodes",
        "High-nitrogen compost tea pre-fertilizer"
      ];
    } else if (goal === "permaculture") {
      plants = "Dwarf Honeycrisp Apple Tree (Overstory), Everbearing Strawberries (Groundcover), Sweet Basil & Dill (Companion herbs)";
      innovations = [
        "Self-sustaining Keyhole garden composting basket",
        "Porative clay Olla Pot underground reservoir irrigation",
        "Deep Sheet Mulch layering (lasagna composting) foundation"
      ];
    } else if (goal === "pollinator") {
      plants = "French Lavender, Mammouth Sunflower, Wildflower Clover Blend, French Breakfast Radish (Seed-saver cover)";
      innovations = [
        "Communal wild honeybee Langstroth Hive node",
        "Polythene dome shelter row covers",
        "Clay puddle butterfly mineral watering bath"
      ];
    } else if (goal === "livestock") {
      plants = "Dwarf Mulberry Trees, Organic Forage Peas, Broadleaf Willow Hedges (High-nutrition feeding loop)";
      innovations = [
        "Predator-deterrent LoRa solar perimeter strobe flashers",
        "Chicken coop ventilation heat recovery core",
        "Automatic rainwater cistern paddock watering tubes"
      ];
    } else if (goal === "water") {
      plants = "Heirloom Garlic Bulbs, Rocky Mountain Sage brush, Deep-root Swiss Chard (Drought resilient guilds)";
      innovations = [
        "Double-depth gravel trench rainwater swale channel",
        "Underground moisture preservation biochar blend",
        "Recycled greywater bio-filtration sand cistern"
      ];
    }

    this.activeBlueprint.plants = plants;
    this.activeBlueprint.innovations = innovations;

    // Draw blueprint beautifully inside Canvas
    this.drawBlueprintLayout();

    // Populate blueprint results panel
    this.blueprintLabelName.textContent = name;
    this.blueprintDimensionsBadge.textContent = `${width}' x ${length}' Area`;
    this.blueprintPlantsList.textContent = plants;
    
    // Populate innovations list
    this.blueprintInnovationsList.innerHTML = "";
    innovations.forEach(inn => {
      const li = document.createElement("li");
      li.textContent = inn;
      this.blueprintInnovationsList.appendChild(li);
    });

    // Display panel and scroll
    this.blueprintDisplayPanel.style.display = "block";
    this.blueprintDisplayPanel.scrollIntoView({ behavior: 'smooth' });

    this.addActivity(`Generated space blueprint layout: "${name}" (${width}'x${length}')`, "system", "🎨");
  }

  // Draw blueprint layout on Canvas using premium blueprint drafts aesthetics
  drawBlueprintLayout() {
    const canvas = this.blueprintCanvas;
    const ctx = canvas.getContext("2d");
    const bp = this.activeBlueprint;
    if (!bp) return;

    const cw = canvas.width;
    const ch = canvas.height;

    // 1. Fill blueprint dark blueprint drafting blue
    ctx.fillStyle = "#0c2340";
    ctx.fillRect(0, 0, cw, ch);

    // 2. Draw fine blueprint drafting grid lines
    ctx.strokeStyle = "rgba(0, 168, 204, 0.15)";
    ctx.lineWidth = 1;
    const gridSpacing = 20;
    for (let x = 0; x < cw; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ch);
      ctx.stroke();
    }
    for (let y = 0; y < ch; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
      ctx.stroke();
    }

    // 3. Draw outer dimension scale border
    ctx.strokeStyle = "rgba(0, 168, 204, 0.4)";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, cw - 20, ch - 20);

    // 4. Draw diagonal border hash ticks (like real blueprint scales)
    ctx.fillStyle = "rgba(0, 168, 204, 0.5)";
    ctx.font = "7px monospace";
    ctx.fillText("0'", 15, 20);
    ctx.fillText(`${bp.width}'`, cw - 30, 20);
    ctx.fillText("0'", 15, ch - 15);
    ctx.fillText(`${bp.length}'`, 15, ch - 25);

    // 5. Draw visual garden layout elements based on Goal
    const cx = cw / 2;
    const cy = ch / 2;

    ctx.lineWidth = 1.5;

    if (bp.goal === "market") {
      // Draw straight linear rows of crops
      ctx.strokeStyle = "rgba(142, 200, 50, 0.4)";
      for (let r = 40; r < cw - 40; r += 40) {
        // Drip line path
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 168, 204, 0.5)";
        ctx.setLineDash([4, 4]);
        ctx.moveTo(r, 30);
        ctx.lineTo(r, ch - 30);
        ctx.stroke();
        ctx.setLineDash([]);

        // Crop circles
        ctx.fillStyle = "rgba(142, 50, 50, 0.7)"; // Tomatoes
        for (let cy_pos = 50; cy_pos < ch - 40; cy_pos += 35) {
          ctx.beginPath();
          ctx.arc(r - 8, cy_pos, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "rgba(50, 142, 50, 0.7)"; // Greens
          ctx.beginPath();
          ctx.arc(r + 8, cy_pos + 10, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw soil moisture LoRa sensor
      this.drawSensorNode(ctx, cx, cy, "LoRa Probe S-01");
    } else if (bp.goal === "permaculture") {
      // Draw circular polyculture guilds (concentric rings)
      ctx.strokeStyle = "rgba(230, 92, 0, 0.6)"; // Fruit tree crown
      ctx.beginPath();
      ctx.arc(cx, cy, 50, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(230, 92, 0, 0.1)";
      ctx.fill();

      // Tree trunk center
      ctx.fillStyle = "rgba(139, 69, 19, 0.8)";
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();

      // Herb buffer outer spots
      ctx.fillStyle = "rgba(50, 200, 50, 0.8)";
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const hx = cx + Math.cos(angle) * 75;
        const hy = cy + Math.sin(angle) * 75;
        ctx.beginPath();
        ctx.arc(hx, hy, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Composting Keyhole path
      ctx.strokeStyle = "rgba(0, 168, 204, 0.6)";
      ctx.beginPath();
      ctx.moveTo(cx, ch - 20);
      ctx.lineTo(cx, cy + 30);
      ctx.stroke();

      // Olla irrigation pot clay indicator
      this.drawSensorNode(ctx, cx - 60, cy - 30, "Olla Irrigation Pot");
    } else if (bp.goal === "pollinator") {
      // Draw dense honeycomb-like clusters or wavy flower beds
      ctx.strokeStyle = "rgba(240, 200, 50, 0.5)";
      ctx.beginPath();
      ctx.arc(cx - 50, cy - 30, 30, 0, Math.PI * 2);
      ctx.arc(cx + 50, cy + 30, 35, 0, Math.PI * 2);
      ctx.stroke();

      // Draw hives
      ctx.fillStyle = "rgba(240, 180, 50, 0.8)";
      ctx.fillRect(cx - 10, cy - 10, 20, 20);
      ctx.strokeStyle = "#ffffff";
      ctx.strokeRect(cx - 10, cy - 10, 20, 20);
      ctx.fillStyle = "#000000";
      ctx.font = "8px monospace";
      ctx.fillText("BEE", cx - 7, cy + 3);

      // Flower dots
      ctx.fillStyle = "rgba(200, 50, 200, 0.7)"; // Lavender
      for (let i = 0; i < 15; i++) {
        const fx = cx - 50 + (Math.random() - 0.5) * 40;
        const fy = cy - 30 + (Math.random() - 0.5) * 40;
        ctx.beginPath();
        ctx.arc(fx, fy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (bp.goal === "livestock") {
      // Draw paddock perimeter fencing line
      ctx.strokeStyle = "rgba(230, 92, 0, 0.7)";
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(30, 30, cw - 60, ch - 60);
      ctx.setLineDash([]);

      // Willow foraging hedge rows
      ctx.fillStyle = "rgba(50, 150, 50, 0.6)";
      ctx.fillRect(50, 50, 40, ch - 100);
      ctx.fillRect(cw - 90, 50, 40, ch - 100);

      // Animal water trough indicator
      ctx.fillStyle = "rgba(0, 168, 204, 0.7)";
      ctx.fillRect(cx - 20, cy - 15, 40, 30);
      ctx.fillStyle = "#ffffff";
      ctx.font = "6px monospace";
      ctx.fillText("WATER CISTERN", cx - 18, cy + 3);
    } else if (bp.goal === "water") {
      // Draw wavy drainage swale lines
      ctx.strokeStyle = "rgba(0, 168, 204, 0.7)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(30, cy - 40);
      ctx.bezierCurveTo(cw/3, cy - 80, cw*2/3, cy + 20, cw - 30, cy - 20);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(30, cy + 40);
      ctx.bezierCurveTo(cw/3, cy, cw*2/3, cy + 100, cw - 30, cy + 60);
      ctx.stroke();

      // Gravel swale text label
      ctx.fillStyle = "rgba(0, 168, 204, 0.8)";
      ctx.font = "7px monospace";
      ctx.fillText("RAINWATER SWALE CHANNEL", cx - 50, cy - 35);

      // Olla Pots
      this.drawSensorNode(ctx, cx, cy + 30, "Biochar Trench");
    }
  }

  drawSensorNode(ctx, x, y, label) {
    // Draw pulsing sensor node circle
    ctx.strokeStyle = "rgba(0, 168, 204, 0.8)";
    ctx.fillStyle = "rgba(0, 168, 204, 0.25)";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pulse outer ring
    ctx.strokeStyle = "rgba(0, 168, 204, 0.3)";
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.stroke();

    // Label
    ctx.fillStyle = "#ffffff";
    ctx.font = "6px monospace";
    ctx.fillText(label, x + 10, y + 2);
  }

  // 6. Plot Reservation connector
  reservePlotFromBlueprint() {
    const bp = this.activeBlueprint;
    if (!bp) return;

    // Find first vacant plot bed
    const vacantPlot = this.plots.find(p => !p.reserved);
    if (!vacantPlot) {
      alert("No vacant field plots are currently available in the Communal Grid! Release a plot in the Communal Grid first.");
      return;
    }

    vacantPlot.reserved = true;
    vacantPlot.label = bp.name.substring(0, 8); // Fit in cell box

    this.addActivity(`Reserved field plot: ${vacantPlot.label} via Space Blueprint Planner`, "system", "🗺️");
    
    this.saveToStorage();
    this.render();

    alert(`Success! Plot bed [${vacantPlot.label}] has been reserved for your blueprint layout in the Communal Grid.`);
  }

  // 7. Seed Vault checkout connector
  sowSeedsFromBlueprint() {
    const bp = this.activeBlueprint;
    if (!bp) return;

    const seedIds = bp.goal === "market" ? ["seed-1", "seed-3"] 
                  : bp.goal === "permaculture" ? ["seed-1", "seed-3", "seed-4"]
                  : bp.goal === "pollinator" ? ["seed-3", "seed-4"]
                  : bp.goal === "livestock" ? ["seed-2"]
                  : ["seed-4"];

    let successCount = 0;
    seedIds.forEach(id => {
      const seed = this.seeds.find(s => s.id === id);
      if (seed && seed.packets > 0) {
        seed.packets--;
        seed.checkedOut++;
        successCount++;
        this.addActivity(`Blueprint deduct: Sowed 1 packet of ${seed.name} from seed vault`, "system", "🌱");
      }
    });

    if (successCount === 0) {
      alert("All suggested seeds for this blueprint are currently out of stock in the Seed Vault bank!");
      return;
    }

    this.saveToStorage();
    this.render();

    alert(`Success! Checked out and sowed ${successCount} companion seed packets from the Communal Seed Vault bank for your blueprint guild.`);
  }

  // 8. Download Canvas Printable Blueprint
  exportBlueprintCanvas() {
    const bp = this.activeBlueprint;
    if (!bp) return;

    try {
      const dataUrl = this.blueprintCanvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `CommonGround_${bp.name.replace(/\s+/g, '_')}_Blueprint.png`;
      link.href = dataUrl;
      link.click();
      
      this.addActivity(`Exported space layout blueprint: "${bp.name}"`, "system", "💾");
      alert(`Success! Your homestead blueprint file [${link.download}] was successfully generated and downloaded.`);
    } catch (err) {
      console.error("Blueprint export error:", err);
      alert("Unable to export canvas image due to browser sandboxing or context errors.");
    }
  }

  // ==========================================================================
  // --- INTEGRATED MODULE 9: SaaS COMPLIANCE & WIRELESS TELEMETRY ---
  // ==========================================================================
  
  // 1. USDA Hardiness Zone Selector
  handleUsdaZoneChange() {
    this.usdaZone = parseInt(this.settingsUsdaZone.value, 10);
    this.addActivity(`USDA Hardiness Zone updated to: Zone ${this.usdaZone}`, "system", "⚙️");
    this.saveToStorage();
    this.render();
  }

  // 2. Cottage Food safe-harbors disclaimers input
  handleCottageFoodChange() {
    this.cottageFoodStatement = this.settingsCottageFood.value;
    this.saveToStorage();
  }

  // 3. Wireless LoRaWAN nodes manual telemetry ping
  pingLoraNodes() {
    this.loraPacketsCount += 4;
    this.loraPackets.textContent = `${this.loraPacketsCount.toLocaleString()} packets`;
    
    // Pulse RSSI
    const rssiVal = -78;
    this.loraRssi.textContent = `${rssiVal} dBm (Strong)`;
    this.loraRssi.style.color = "var(--accent-sage)";

    if (this.loraGatewayConsole) {
      const pingLog = document.createElement("div");
      pingLog.innerHTML = `<span style="color: var(--accent-sage);">[${new Date().toLocaleTimeString()}] [GATEWAY] Manual ping executed. 4 LoRa nodes reporting optimal signal!</span>`;
      this.loraGatewayConsole.appendChild(pingLog);
      
      this.loraGatewayConsole.scrollTop = this.loraGatewayConsole.scrollHeight;
    }

    this.addActivity("LoRa Telemetry Gateway: Manual nodes ping completed", "system", "⚡");
    this.saveToStorage();
  }

  // 4. Crop Frost calculations algorithm
  isCropInFrostDanger(crop) {
    // Frost months mapping per zone (0-indexed: Jan=0, Feb=1, Mar=2, Apr=3, May=4, Jun=5, Jul=6, Aug=7, Sep=8, Oct=9, Nov=10, Dec=11)
    const activeFrostMonths = {
      5: [3, 4, 8, 9], // April, May, September, October
      6: [3, 9],    // April, October
      7: [2, 9],    // March, October
      8: [1, 10],   // February, November
      9: []         // Safe
    };

    const hazardMonths = activeFrostMonths[this.usdaZone] || [];
    if (hazardMonths.length === 0) return false;

    // Check if the current simulated month is inside the active frost hazard window
    const currentMonth = this.currentDate.getMonth();
    return hazardMonths.includes(currentMonth);
  }

  // ==========================================================================
  // --- INTEGRATED MODULE 10: ULTIMATE AGTECH EXPANSION SYSTEMS ---
  // ==========================================================================

  // 1. Succession Seeding schedule generator
  generateSuccessionTimeline() {
    const cropVal = this.successionCropSelect.value;
    const intervalDays = parseInt(this.successionInterval.value, 10);
    
    // Growth days mapped per variety
    const cropDurations = {
      lettuce: 45,
      radish: 22,
      spinach: 38,
      carrot: 70,
      arugula: 30
    };
    const growthDays = cropDurations[cropVal] || 30;
    const cropLabel = this.successionCropSelect.options[this.successionCropSelect.selectedIndex].text.split(" (")[0];

    this.successionTimelineContainer.innerHTML = "";
    const startDate = new Date(this.currentDate.getTime());

    for (let i = 1; i <= 5; i++) {
      const seedingDate = new Date(startDate.getTime() + (i - 1) * intervalDays * 24 * 60 * 60 * 1000);
      const harvestDate = new Date(seedingDate.getTime() + growthDays * 24 * 60 * 60 * 1000);
      
      const formatOpt = { month: 'short', day: 'numeric' };
      const seedStr = seedingDate.toLocaleDateString('en-US', formatOpt);
      const harvestStr = harvestDate.toLocaleDateString('en-US', formatOpt);

      const timelineCard = document.createElement("div");
      timelineCard.className = "succession-timeline-card";
      timelineCard.innerHTML = `
        <div class="succession-step-badge">${i}</div>
        <div style="font-weight: 700; font-size: 0.8rem; margin-bottom: 6px; color: var(--text-primary);">Cycle #${i}</div>
        <div style="font-size: 0.72rem; margin-bottom: 4px;">🌱 Sow: <strong style="color: var(--accent-sage);">${seedStr}</strong></div>
        <div style="font-size: 0.72rem;">🧺 Harvest: <strong style="color: var(--accent-amber);">${harvestStr}</strong></div>
      `;
      this.successionTimelineContainer.appendChild(timelineCard);
    }

    this.successionScheduleResults.style.display = "block";
    this.addActivity(`Generated 5 succession seeding cycles for: ${cropLabel}`, "system", "🗓️");
  }

  // T1.1: Sync-engine bridge ------------------------------------------------
  // Routes property-level mutations through commonGroundSyncEngine when the
  // orchestrator has wired it up. Failure is non-fatal — local state still
  // saves to localStorage via saveToStorage(); the engine call only adds
  // CRDT outbox propagation.
  _syncRecord(table, record) {
    try {
      const engine = window.appOrchestrator && window.appOrchestrator.syncEngine;
      if (!engine || typeof engine.saveRecordLocally !== 'function') return;
      // Fire-and-forget — the outbox + IndexedDB writes are async, but we
      // never block the UI on them.
      engine.saveRecordLocally(table, record).catch(err => {
        console.warn(`[app] sync engine write to ${table}:${record.id} failed:`, err.message || err);
      });
    } catch (err) {
      console.warn('[app] _syncRecord threw:', err);
    }
  }

  // 2. Rotational Pasture Grazing herd rotation
  rotateGrazingHerd() {
    // Find active grazing paddock
    const activePaddock = this.paddocks.find(p => p.status === "grazing");

    // Find next paddock in alphabetical rotational order
    const currentIndex = activePaddock ? this.paddocks.indexOf(activePaddock) : 0;
    const nextIndex = (currentIndex + 1) % this.paddocks.length;
    const nextPaddock = this.paddocks[nextIndex];

    if (!nextPaddock) {
      alert("No pasture paddocks are registered in the database!");
      return;
    }

    // Process rotation swap
    if (activePaddock) {
      activePaddock.status = "recovering";
      activePaddock.restDays = 0;
      activePaddock.height = 2.0;
      // T1.1: propagate via sync engine so other devices see the rotation.
      this._syncRecord('paddock_planner', {
        id:                  activePaddock.id,
        name:                activePaddock.name,
        current_status:      'recovering',
        last_rotation_date:  new Date().toISOString(),
        height_inches:       activePaddock.height,
        recovery_days_needed: 30
      });
    }

    nextPaddock.status = "grazing";
    nextPaddock.restDays = 0;
    this._syncRecord('paddock_planner', {
      id:                  nextPaddock.id,
      name:                nextPaddock.name,
      current_status:      'grazing',
      last_rotation_date:  new Date().toISOString()
    });

    this.addActivity(`Rotated co-op herd from ${activePaddock ? activePaddock.name : 'Staging'} to ${nextPaddock.name}`, "system", "🔄");

    this.saveToStorage();
    this.render();

    this.showToast(`Pasture Rotation Successful! The grazing herd has been moved to [${nextPaddock.name}]. Active pasture heights are now updating.`, "success");
  }

  // 3. Render grazing paddock cards
  renderPaddocks() {
    // Acquire the EnvironmentalCalibrator from our systemOrchestrator
    const calibrator = window.appOrchestrator ? window.appOrchestrator.climateCalibrator : null;

    this.paddocks.forEach(p => {
      const cardEl = document.getElementById(`paddock-card-${p.id}`);
      const statusEl = document.getElementById(`paddock-status-${p.id}`);
      const heightEl = document.getElementById(`paddock-height-${p.id}`);
      const restEl = document.getElementById(`paddock-rest-${p.id}`);
      const progressEl = document.getElementById(`paddock-progress-bar-${p.id}`);
      const percentEl = document.getElementById(`paddock-progress-percent-${p.id}`);

      if (!cardEl) return;

      heightEl.textContent = `${p.height} inches`;

      const restPercent = Math.round((p.restDays / 30) * 100);
      progressEl.style.width = `${restPercent}%`;
      percentEl.textContent = `${restPercent}% Pasture Rested`;

      cardEl.classList.remove("active-grazing-border");
      statusEl.className = "badge";

      // 1. Determine active temperature and weather variables dynamically
      const activeTemperature = this.solarBattery < 40 ? 38 : 65; // cold if overcast, nice if solar high
      const currentHumidity = 52;
      const historicalRainfallMm = this.cisternWater < 3000 ? 10 : 25; // deficit if water low
      
      // Calculate biomass dynamically from paddock vegetation height
      // Height * 250 represents dry matter forage lbs/acre (e.g. 6 inches = 1500 lbs/acre)
      const baseBiomass = p.height * 250;
      const areaInAcres = 2.5;

      // Grazing herd profiles: default to cow, sheep, or goat based on paddock active status or active livestock list
      let species = 'cow';
      let animalCount = 10;
      let avgWeight = 1000;

      // Let's grab grazing herd details dynamically if they exist in this.livestock
      if (this.livestock && this.livestock.length > 0) {
        const goats = this.livestock.find(l => l.type === 'dairy');
        if (goats) {
          species = 'goat';
          animalCount = goats.qty;
          avgWeight = 135; // typical dairy goat weight in lbs
        }
      }

      let activeAUD = p.cap;
      let constraintReason = "";

      if (calibrator) {
        const calResult = calibrator.calculateDynamicAUD(
          baseBiomass,
          areaInAcres,
          currentHumidity,
          historicalRainfallMm,
          activeTemperature,
          species,
          animalCount,
          avgWeight
        );
        activeAUD = calResult.adjustedAUD;
        constraintReason = calResult.description;
      } else {
        // Fallback standard formula if calibrator is not loaded yet
        let climateScale = 1.0;
        const isFrostZoneActive = (this.usdaZone === 6 && (this.currentDate.getMonth() === 3 || this.currentDate.getMonth() === 9));
        const isSolarLow = (this.solarBattery < 40);
        if (isFrostZoneActive) {
          climateScale = 0.65;
          constraintReason = "Zone 6 Frost Constraint (-35%)";
        } else if (isSolarLow) {
          climateScale = 0.75;
          constraintReason = "Cloudy Sunlight Constraint (-25%)";
        } else if (this.cisternWater < 3000) {
          climateScale = 0.60;
          constraintReason = "Soil Moisture Water Deficit (-40%)";
        }
        const rawAUD = Math.round(p.height * 4 * climateScale);
        activeAUD = Math.max(2, Math.min(p.cap, rawAUD));
      }

      // Locate capacity info in card and update dynamically
      const audLabelContainer = cardEl.querySelector("div > div:nth-child(2) > strong");
      if (audLabelContainer) {
        audLabelContainer.innerHTML = `${activeAUD} AUD <span style="font-size:0.6rem; color:var(--accent-clay); display:block; font-weight:normal; max-width: 200px; line-height: 1.2; margin-top: 2px;">${constraintReason}</span>`;
      }

      if (p.status === "grazing") {
        cardEl.classList.add("active-grazing-border");
        statusEl.classList.add("badge-clay");
        statusEl.textContent = "Active Grazing";
        restEl.textContent = "Being Grazed (AUD depleting)";
        progressEl.style.background = "var(--accent-clay)";
      } else if (p.status === "recovering") {
        statusEl.classList.add("badge-amber");
        statusEl.textContent = "Recovering";
        restEl.textContent = `Rested ${p.restDays} / 30 Days`;
        progressEl.style.background = "var(--accent-amber)";
      } else if (p.status === "ready") {
        statusEl.classList.add("badge-sage");
        statusEl.textContent = "Ready to Graze";
        restEl.textContent = "Fully Rested (30 / 30 Days)";
        progressEl.style.background = "var(--accent-sage)";
      }
    });
  }

  // 4. Soil NPK Chemistry Amendment Engine submit
  handleSoilCalculatorSubmit(e) {
    e.preventDefault();

    const nVal = parseInt(this.soilInputN.value, 10);
    const pVal = parseInt(this.soilInputP.value, 10);
    const kVal = parseInt(this.soilInputK.value, 10);
    const phVal = parseFloat(this.soilInputPh.value);
    const targetCrop = this.soilTargetCrop.value;

    const targets = {
      heavy: { n: 140, p: 70, k: 180, phMin: 6.2, phMax: 6.8 },
      light: { n: 50, p: 40, k: 100, phMin: 6.0, phMax: 7.0 },
      root:  { n: 80, p: 60, k: 150, phMin: 5.8, phMax: 6.5 }
    };
    const t = targets[targetCrop] || targets.heavy;

    const defN = Math.max(0, t.n - nVal);
    const defP = Math.max(0, t.p - pVal);
    const defK = Math.max(0, t.k - kVal);

    const bloodMealFactor = 0.035; 
    const boneMealFactor = 0.025;  
    const greensandFactor = 0.015; 

    const reqBloodMeal = (defN * bloodMealFactor).toFixed(1);
    const reqBoneMeal = (defP * boneMealFactor).toFixed(1);
    const reqGreensand = (defK * greensandFactor).toFixed(1);

    let reqLime = 0.0;
    if (phVal < t.phMin) {
      const phDeficit = t.phMin - phVal;
      reqLime = ((phDeficit / 0.5) * 1.8).toFixed(1);
    }

    this.amendmentQtyN.textContent = `${reqBloodMeal} lbs`;
    this.amendmentQtyP.textContent = `${reqBoneMeal} lbs`;
    this.amendmentQtyK.textContent = `${reqGreensand} lbs`;
    this.amendmentQtyPh.textContent = `${reqLime} lbs`;

    this.soilAmendmentResults.style.display = "block";
    this.addActivity(`Calculated organic NPK soil amendment recipe for: ${this.soilTargetCrop.options[this.soilTargetCrop.selectedIndex].text}`, "system", "🧪");
  }

  // Restorative UX Non-blocking Toast notifications
  showToast(message, type = "success") {
    let container = document.getElementById("cg-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "cg-toast-container";
      document.body.appendChild(container);
    }
    
    const icons = {
      success: "✨",
      error: "⚠️",
      warning: "❄️",
      info: "ℹ️"
    };
    
    const icon = icons[type] || "✨";
    const toast = document.createElement("div");
    toast.className = `cg-toast cg-toast-${type}`;
    
    // F-09: Enforce WCAG A11y visibility so screen-readers announce incoming events
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    
    toast.innerHTML = `
      <span class="cg-toast-icon">${icon}</span>
      <div class="cg-toast-content">${message}</div>
      <button class="cg-toast-close" aria-label="Close notification">×</button>
    `;
    
    // F-10: Dynamic Pause-on-Hover auto-dismiss timing (WCAG 2.2 Success Criterion 2.2.1 compliance)
    let isHovered = false;
    let dismissTimer;
    
    const dismiss = () => {
      if (toast.parentNode) {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 400);
      }
    };
    
    const startDismissTimer = () => {
      clearTimeout(dismissTimer);
      dismissTimer = setTimeout(() => {
        if (!isHovered) {
          dismiss();
        }
      }, 4000);
    };
    
    toast.addEventListener("mouseenter", () => {
      isHovered = true;
      clearTimeout(dismissTimer);
    });
    
    toast.addEventListener("mouseleave", () => {
      isHovered = false;
      startDismissTimer();
    });
    
    const closeBtn = toast.querySelector(".cg-toast-close");
    closeBtn.addEventListener("click", () => {
      clearTimeout(dismissTimer);
      dismiss();
    });
    
    container.appendChild(toast);
    
    // Trigger slide/fade transitions
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add("show");
      });
    });
    
    // Start initial timer
    startDismissTimer();
  }
}

// --- INITIALIZE APPLICATION ENGINE ---
let app;
document.addEventListener("DOMContentLoaded", () => {
  app = new CommonGroundApp();
  window.app = app;

  // T5.2: load the focus-framework design tokens before any rendering of
  // status badges. Fires asynchronously; rendered surfaces should consult
  // window.cgFocus.ready or listen for the cg-focus-ready event.
  app.loadFocusFramework();

  // REGISTER PWA SERVICE WORKER
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js")
      .then(reg => console.log("[PWA] Service Worker registered scope:", reg.scope))
      .catch(err => console.error("[PWA] Service Worker registration failed:", err));
  }
});
