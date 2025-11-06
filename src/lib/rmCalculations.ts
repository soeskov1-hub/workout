// RM percentage table based on standard strength training principles
// Maps number of reps to percentage of 1RM
export const RM_PERCENTAGES: Record<number, number> = {
  1: 100,
  2: 95,
  3: 93,
  4: 90,
  5: 89,
  6: 86,
  7: 83,
  8: 81,
  9: 78,
  10: 75,
  11: 73,
  12: 71,
  13: 69,
  14: 67,
  15: 65,
}

/**
 * Calculate estimated 1RM from a set using Brzycki formula
 * Formula: 1RM = weight / (1.0278 - 0.0278 × reps)
 * Valid for 1-10 reps. Returns null for invalid inputs.
 */
export function calculate1RMFromSet(weight: number, reps: number): number | null {
  if (reps < 1 || reps > 10 || weight <= 0) {
    return null
  }
  
  if (reps === 1) {
    return weight
  }
  
  const brzycki = weight / (1.0278 - 0.0278 * reps)
  return Math.round(brzycki * 2) / 2 // Round to nearest 0.5 kg
}

/**
 * Calculate suggested weight for a target number of reps based on 1RM
 */
export function getSuggestedWeightFromRM(oneRM: number, targetReps: number): number {
  const percentage = RM_PERCENTAGES[targetReps] || 75 // Default to 75% if reps > 15
  const weight = (oneRM * percentage) / 100
  return Math.round(weight * 2) / 2 // Round to nearest 0.5 kg
}

/**
 * Get the working percentage for a given RPE and rep count
 * RPE 10 = 100% of max for that rep range
 * RPE 9 = ~95% (1 rep in reserve)
 * RPE 8 = ~90% (2 reps in reserve)
 * RPE 7 = ~85% (3 reps in reserve)
 */
export function getWorkingPercentageForRPE(rpe: number): number {
  const rpeMap: Record<number, number> = {
    10: 100,
    9: 95,
    8: 90,
    7: 85,
    6: 80,
  }
  return rpeMap[rpe] || 85 // Default to RPE 7-8
}

/**
 * Adjust suggested weight based on RPE target
 * If targeting RPE 8 instead of RPE 10, reduce the weight accordingly
 */
export function adjustWeightForTargetRPE(
  baseWeight: number,
  currentRPE: number,
  targetRPE: number
): number {
  if (currentRPE === targetRPE) {
    return baseWeight
  }
  
  const currentPercentage = getWorkingPercentageForRPE(currentRPE)
  const targetPercentage = getWorkingPercentageForRPE(targetRPE)
  
  const adjustment = (targetPercentage / currentPercentage)
  const adjustedWeight = baseWeight * adjustment
  
  return Math.round(adjustedWeight * 2) / 2 // Round to nearest 0.5 kg
}

/**
 * Analyze progression over last N sessions for an exercise
 * Returns average weight, trend, and suggested progression
 */
export interface ProgressionAnalysis {
  averageWeight: number
  trend: 'increasing' | 'stable' | 'decreasing'
  suggestedIncrease: number
  lastWeight: number
  sessionCount: number
}

export function analyzeProgression(
  recentWeights: number[],
  standardIncrement: number = 2.5
): ProgressionAnalysis | null {
  if (recentWeights.length === 0) {
    return null
  }
  
  const lastWeight = recentWeights[recentWeights.length - 1]
  const averageWeight = recentWeights.reduce((a, b) => a + b, 0) / recentWeights.length
  
  // Analyze trend
  let trend: 'increasing' | 'stable' | 'decreasing' = 'stable'
  if (recentWeights.length >= 2) {
    const firstHalf = recentWeights.slice(0, Math.ceil(recentWeights.length / 2))
    const secondHalf = recentWeights.slice(Math.ceil(recentWeights.length / 2))
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    
    if (secondAvg > firstAvg + 1) {
      trend = 'increasing'
    } else if (secondAvg < firstAvg - 1) {
      trend = 'decreasing'
    }
  }
  
  // Suggest progression based on trend
  let suggestedIncrease = standardIncrement
  if (trend === 'increasing') {
    suggestedIncrease = standardIncrement * 1.5 // More aggressive
  } else if (trend === 'decreasing') {
    suggestedIncrease = 0 // Don't increase, maintain or deload
  }
  
  return {
    averageWeight: Math.round(averageWeight * 2) / 2,
    trend,
    suggestedIncrease: Math.round(suggestedIncrease * 2) / 2,
    lastWeight,
    sessionCount: recentWeights.length
  }
}

/**
 * Get smart weight suggestion based on 1RM, historical data, and RPE
 */
export interface WeightSuggestion {
  suggestedWeight: number
  reason: string
  increase: number
}

export function getSmartWeightSuggestion(
  oneRM: number | null,
  targetReps: number,
  recentWeights: number[],
  targetRPE: number = 8
): WeightSuggestion {
  // If we have 1RM, use it as the primary guide
  if (oneRM !== null && oneRM > 0) {
    const baseWeight = getSuggestedWeightFromRM(oneRM, targetReps)
    const adjustedWeight = adjustWeightForTargetRPE(baseWeight, 10, targetRPE)
    
    const lastWeight = recentWeights.length > 0 ? recentWeights[recentWeights.length - 1] : 0
    const increase = adjustedWeight - lastWeight
    
    return {
      suggestedWeight: adjustedWeight,
      reason: `Baseret på 1RM (${oneRM} kg) og ${targetReps} reps @ RPE ${targetRPE}`,
      increase: Math.round(increase * 2) / 2
    }
  }
  
  // Fallback to progression analysis
  const progression = analyzeProgression(recentWeights)
  
  if (!progression) {
    return {
      suggestedWeight: 20, // Starting weight
      reason: 'Start vægt (ingen historik)',
      increase: 0
    }
  }
  
  const suggestedWeight = progression.lastWeight + progression.suggestedIncrease
  
  let reason = 'Baseret på seneste træning'
  if (progression.trend === 'increasing') {
    reason += ' (stigende trend - øg mere)'
  } else if (progression.trend === 'decreasing') {
    reason += ' (faldende - hold vægten)'
  }
  
  return {
    suggestedWeight: Math.round(suggestedWeight * 2) / 2,
    reason,
    increase: progression.suggestedIncrease
  }
}
