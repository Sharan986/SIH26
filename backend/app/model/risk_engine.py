import logging
from typing import Dict, Any, Tuple

logger = logging.getLogger("voiceguard.risk_engine")

class RiskEngine:
    """
    Contextual Risk Engine: Blends acoustic deepfake probabilities with session metadata
    (e.g., transaction value, caller reputation) to compute a dynamic, business-aligned risk score.
    """
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = RiskEngine()
        return cls._instance

    def evaluate(self, acoustic_ai_probability: float, metadata: Dict[str, Any]) -> Tuple[float, str]:
        """
        Evaluate the total impersonation risk.
        Returns:
            Tuple[float, str]: (blended_risk_score, recommended_action)
        """
        # Base risk is heavily weighted towards the ML acoustic analysis
        blended_risk = acoustic_ai_probability
        
        transaction_value = metadata.get("transaction_value", 0.0)
        reputation = metadata.get("caller_reputation_score", 50)
        is_known = metadata.get("is_known_contact", False)
        past_fraud = metadata.get("historical_fraud_flags", 0)
        
        # 1. High Value Transaction Penalty
        if transaction_value > 10000:
            if acoustic_ai_probability > 0.40: # Even slight suspicion is magnified
                blended_risk += 0.15
            elif acoustic_ai_probability > 0.20:
                blended_risk += 0.05
                
        # 2. Known Contact Bonus
        if is_known:
            blended_risk -= 0.10
            
        # 3. Reputation and History Penalty
        if past_fraud > 0:
            blended_risk += 0.25
        if reputation < 30:
            blended_risk += 0.10
            
        # Clamp between 0.0 and 1.0
        blended_risk = max(0.0, min(1.0, blended_risk))
        
        # Determine Threshold-based Recommended Action
        if blended_risk >= 0.75:
            action = "BLOCK_TRANSACTION_AND_ESCALATE"
        elif blended_risk >= 0.55:
            if transaction_value > 5000:
                action = "REQUIRE_MFA_OR_CALLBACK"
            else:
                action = "WARN_USER"
        elif blended_risk >= 0.35:
            action = "MONITOR_SESSION"
        else:
            action = "PROCEED_SAFELY"
            
        logger.debug(f"RiskEngine: Acoustic {acoustic_ai_probability:.2f} -> Blended {blended_risk:.2f} [{action}]")
        return round(blended_risk, 4), action
