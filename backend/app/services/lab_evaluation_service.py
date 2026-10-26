import re
from typing import Dict, List, Optional
from pydantic import BaseModel


class LabThresholdRule(BaseModel):
    test_key: str
    canonical_name: str
    unit: str
    normal_min: float
    normal_max: float
    critical_low: Optional[float] = None
    critical_high: Optional[float] = None
    flag_low: str
    flag_high: str
    flag_critical_low: Optional[str] = None
    flag_critical_high: Optional[str] = None


# Deterministic Clinical Diagnostic Reference Ranges
CLINICAL_THRESHOLDS: Dict[str, LabThresholdRule] = {
    "troponin": LabThresholdRule(
        test_key="troponin",
        canonical_name="Cardiac Troponin I",
        unit="ng/mL",
        normal_min=0.0,
        normal_max=0.04,
        critical_high=0.40,
        flag_low="",
        flag_high="ELEVATED_TROPONIN",
        flag_critical_high="CRITICAL_MYOCARDIAL_INJURY",
    ),
    "glucose": LabThresholdRule(
        test_key="glucose",
        canonical_name="Fasting Blood Glucose",
        unit="mg/dL",
        normal_min=70.0,
        normal_max=100.0,
        critical_low=50.0,
        critical_high=250.0,
        flag_low="HYPOGLYCEMIA",
        flag_high="HYPERGLYCEMIA",
        flag_critical_low="CRITICAL_HYPOGLYCEMIA",
        flag_critical_high="CRITICAL_HYPERGLYCEMIA_DKA_RISK",
    ),
    "hba1c": LabThresholdRule(
        test_key="hba1c",
        canonical_name="Glycated Hemoglobin (HbA1c)",
        unit="%",
        normal_min=4.0,
        normal_max=5.6,
        critical_high=10.0,
        flag_low="",
        flag_high="ELEVATED_HBA1C_DIABETES",
        flag_critical_high="UNCONTROLLED_DIABETES",
    ),
    "potassium": LabThresholdRule(
        test_key="potassium",
        canonical_name="Serum Potassium",
        unit="mEq/L",
        normal_min=3.5,
        normal_max=5.1,
        critical_low=3.0,
        critical_high=6.0,
        flag_low="HYPOKALEMIA",
        flag_high="HYPERKALEMIA",
        flag_critical_low="CRITICAL_HYPOKALEMIA_ARRHYTHMIA_RISK",
        flag_critical_high="CRITICAL_HYPERKALEMIA_CARDIAC_ARREST_RISK",
    ),
    "creatinine": LabThresholdRule(
        test_key="creatinine",
        canonical_name="Serum Creatinine",
        unit="mg/dL",
        normal_min=0.6,
        normal_max=1.2,
        critical_high=3.0,
        flag_low="",
        flag_high="ELEVATED_CREATININE_RENAL_IMPAIRMENT",
        flag_critical_high="ACUTE_KIDNEY_INJURY_CRITICAL",
    ),
    "platelets": LabThresholdRule(
        test_key="platelets",
        canonical_name="Platelet Count",
        unit="/mcL",
        normal_min=150000.0,
        normal_max=450000.0,
        critical_low=50000.0,
        critical_high=1000000.0,
        flag_low="THROMBOCYTOPENIA",
        flag_high="THROMBOCYTOSIS",
        flag_critical_low="CRITICAL_BLEEDING_RISK_THROMBOCYTOPENIA",
        flag_critical_high="EXTREME_THROMBOCYTOSIS",
    ),
    "hemoglobin": LabThresholdRule(
        test_key="hemoglobin",
        canonical_name="Hemoglobin",
        unit="g/dL",
        normal_min=12.0,
        normal_max=17.5,
        critical_low=7.0,
        flag_low="ANEMIA",
        flag_high="POLYCYTHEMIA",
        flag_critical_low="SEVERE_ANEMIA_TRANSFUSION_INDICATED",
    ),
}


class DeterministicEvaluation:
    def __init__(
        self,
        test_name: str,
        value: float,
        unit: str,
        is_abnormal: bool,
        is_critical: bool,
        flags: List[str],
        reference_range: str,
        interpretation: str,
    ):
        self.test_name = test_name
        self.value = value
        self.unit = unit
        self.is_abnormal = is_abnormal
        self.is_critical = is_critical
        self.flags = flags
        self.reference_range = reference_range
        self.interpretation = interpretation


def evaluate_numeric_test(test_identifier: str, value: float) -> Optional[DeterministicEvaluation]:
    """
    Evaluates a specific diagnostic measurement against deterministic clinical thresholds.
    """
    cleaned = test_identifier.lower().strip()
    rule: Optional[LabThresholdRule] = None
    for key, r in CLINICAL_THRESHOLDS.items():
        if key in cleaned:
            rule = r
            break

    if not rule:
        return None

    flags: List[str] = []
    is_critical = False
    is_abnormal = False

    if rule.critical_high is not None and value >= rule.critical_high:
        is_critical = True
        is_abnormal = True
        if rule.flag_critical_high:
            flags.append(rule.flag_critical_high)
        if rule.flag_high:
            flags.append(rule.flag_high)
    elif value > rule.normal_max:
        is_abnormal = True
        if rule.flag_high:
            flags.append(rule.flag_high)
    elif rule.critical_low is not None and value <= rule.critical_low:
        is_critical = True
        is_abnormal = True
        if rule.flag_critical_low:
            flags.append(rule.flag_critical_low)
        if rule.flag_low:
            flags.append(rule.flag_low)
    elif value < rule.normal_min:
        is_abnormal = True
        if rule.flag_low:
            flags.append(rule.flag_low)

    interpretation = "Normal reference range"
    if is_critical:
        interpretation = f"CRITICAL ALERT: {value} {rule.unit} exceeds acute clinical limits ({rule.normal_min}-{rule.normal_max} {rule.unit})"
    elif is_abnormal:
        interpretation = f"Abnormal: {value} {rule.unit} outside standard range ({rule.normal_min}-{rule.normal_max} {rule.unit})"

    return DeterministicEvaluation(
        test_name=rule.canonical_name,
        value=value,
        unit=rule.unit,
        is_abnormal=is_abnormal,
        is_critical=is_critical,
        flags=flags,
        reference_range=f"{rule.normal_min} - {rule.normal_max} {rule.unit}",
        interpretation=interpretation,
    )


def extract_and_evaluate_flags(test_name: str, summary_text: str, user_flags: Optional[List[str]] = None) -> List[str]:
    """
    Parses summary text or test name for numerical values and applies
    deterministic clinical reference thresholds. Merges with any user-provided flags.
    """
    final_flags = list(user_flags) if user_flags else []

    # Look for numerical patterns like "troponin: 0.15", "glucose 220 mg/dl", "potassium = 6.2"
    patterns = [
        r"(?:troponin|ctni)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)",
        r"(?:glucose|sugar|fbs)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)",
        r"(?:hba1c)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)",
        r"(?:potassium|k\+)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)",
        r"(?:creatinine)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)",
        r"(?:platelet[s]?|plt)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)",
        r"(?:hemoglobin|hb)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)",
    ]

    combined_text = f"{test_name} {summary_text}".lower()

    for pat in patterns:
        matches = re.findall(pat, combined_text)
        for m in matches:
            try:
                val = float(m)
                # match pat to rule
                for key in CLINICAL_THRESHOLDS.keys():
                    if key in pat:
                        eval_res = evaluate_numeric_test(key, val)
                        if eval_res and eval_res.flags:
                            for f in eval_res.flags:
                                if f not in final_flags:
                                    final_flags.append(f)
            except ValueError:
                continue

    return final_flags
