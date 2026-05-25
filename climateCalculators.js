/**
 * CommonGround — Dynamic Climate & Environmental Calibrator (EcoloAgent)
 * Computes exact agronomic carrying capacities dynamically by down-scaling
 * base calculations against multi-species body weights, GDD curves, and thermoregulatory demand.
 */
export class EnvironmentalCalibrator {
  constructor(hardinessZone = 6) {
    this.hardinessZone = hardinessZone;
    this.baseGrowthCoefficient = 1.0;
  }

  /**
   * Computes current operational Animal Unit Days (AUD) based on dynamic climate inputs.
   * Uses continuous biological formulas instead of step-discontinuities.
   * 
   * @param {number} baseBiomass - Estimated dry matter forage in lbs per acre (e.g. 1500)
   * @param {number} areaInAcres - Area size of target paddock
   * @param {number} currentHumidity - Active moisture humidity percentage (0-100)
   * @param {number} historicalRainfallMm - Local cumulative rain indicator for recent 14-day window
   * @param {number} activeTemperature - Current temperature (Fahrenheit) to calculate Zone 6 growth/thermoregulatory limits
   * @param {string} animalSpecies - Active species in the paddock ('cow', 'sheep', 'goat')
   * @param {number} animalCount - Total headcount of grazing animals
   * @param {number} avgAnimalWeight - Average body weight of active grazing individuals (lbs)
   * @returns {Object} Calculated capacity limits, risk alerts, and scale coefficients
   */
  calculateDynamicAUD(
    baseBiomass = 1500, 
    areaInAcres = 2.5, 
    currentHumidity = 50, 
    historicalRainfallMm = 25, 
    activeTemperature = 65,
    animalSpecies = 'cow',
    animalCount = 10,
    avgAnimalWeight = 1000
  ) {
    // 1. Continuous Growing Degree Days (GDD) Pasture Growth curve (G_t)
    // Metabolic base zero for standard forage pasture grass is 40F. Optimal vegetation speed limit is 70F.
    // ECO-1: Cool-season growth shuts down under high-heat stress (TMax = 95F), forming a triangular thermal curve.
    const tBase = 40.0;
    const tOpt = 70.0;
    const tMax = 95.0;
    let growthCoefficient = 0.0;

    if (activeTemperature >= tBase && activeTemperature <= tMax) {
      if (activeTemperature <= tOpt) {
        // Ascending limb: linear vegetative gradient up to optimal peak temperature
        growthCoefficient = (activeTemperature - tBase) / (tOpt - tBase);
      } else {
        // Descending limb: linear decrease from optimal peak to absolute high-temperature cutoff
        growthCoefficient = (tMax - activeTemperature) / (tMax - tOpt);
      }
    }

    // 2. Moisture / Drought Downscale Modifier
    // ECO-2: Replace step discontinuities with smooth continuous mathematical ramps
    const clampedRain = Math.max(0, historicalRainfallMm);
    const rainfallFactor = clampedRain < 15 ? 0.75 + 0.25 * (clampedRain / 15) : 1.0;

    const clampedHum = Math.max(0, Math.min(100, currentHumidity));
    const humidityBonus = clampedHum > 85 ? 0.05 * ((clampedHum - 85) / 15) : 0.0;

    const moistureModifier = rainfallFactor + humidityBonus;

    const netGrowthModifier = growthCoefficient * moistureModifier;

    // 3. F-06: Multi-Species Daily Dry Matter Intake (DMI) based on Metabolic Weight (BW^0.75)
    // Consumption coefficient (k) standard maps: cow (0.12), sheep (0.056), goat (0.056)
    const speciesCoefficients = {
      cow: 0.12,
      sheep: 0.056,
      goat: 0.056
    };
    const k = speciesCoefficients[animalSpecies.toLowerCase()] || 0.12;
    
    // Metabolic body weight weight standard: Weight^0.75
    const metabolicWeight = Math.pow(avgAnimalWeight, 0.75);
    const baseDailyIntake = k * metabolicWeight; // Intake per head per day (lbs)

    // 4. F-07: Metabolic Thermoregulatory Feed Demand Modifier (M_thermo)
    // Cold increases body energy requirements to maintain core heat (LCT = 45F for clean coats)
    const lowerCriticalTemp = 45.0;
    let mThermo = 1.0;
    
    if (activeTemperature < lowerCriticalTemp) {
      const thermoregulatoryConstant = 0.015; // 1.5% intake increase per degree below LCT
      mThermo += thermoregulatoryConstant * (lowerCriticalTemp - activeTemperature);
    }

    const adjustedDailyIntakePerHead = baseDailyIntake * mThermo;
    const totalDailyHerdIntake = adjustedDailyIntakePerHead * animalCount;

    // 5. Total available paddock forage (Allocation Factor = 50% harvest, 50% left to feed soil biology)
    const allocationFactor = 0.50;
    const totalForageLbs = baseBiomass * areaInAcres * allocationFactor;
    
    // Adjusted biomass capacity after growing modifier
    const availableForageLbs = totalForageLbs * netGrowthModifier;

    // Calculate actual Animal Unit Days (AUD) carrying capacity
    // Formula: Adjusted Forage / Daily Herd Intake requirement
    const calculatedCapacityDays = availableForageLbs / adjustedDailyIntakePerHead;
    
    let riskFactor = 'NORMAL';
    if (netGrowthModifier < 0.40) {
      riskFactor = 'HIGH_CLIMATE_STRESS';
    } else if (netGrowthModifier < 0.75) {
      riskFactor = 'MODERATE_STRESS';
    }

    return {
      adjustedAUD: Math.max(0, Math.round(calculatedCapacityDays)),
      riskFactor: riskFactor,
      coefficientApplied: parseFloat(netGrowthModifier.toFixed(2)),
      intakePerHeadDay: parseFloat(adjustedDailyIntakePerHead.toFixed(2)),
      totalHerdIntakeDay: parseFloat(totalDailyHerdIntake.toFixed(2)),
      description: `USDA Zone 6 continuous calibration: vegetative growth scaled at x${netGrowthModifier.toFixed(2)} with animal intake demand increased by x${mThermo.toFixed(2)} under cold thermoregulation.`
    };
  }
}
