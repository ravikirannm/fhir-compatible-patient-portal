"""FHIR Resource Modules"""

from . import patient
from . import encounter
from . import observation
from . import condition
from . import procedure
from . import allergy
from . import immunization
from . import medication_request
from . import medication_admin
from . import diagnostic_report
from . import document_reference

__all__ = [
    "patient",
    "encounter",
    "observation",
    "condition",
    "procedure",
    "allergy",
    "immunization",
    "medication_request",
    "medication_admin",
    "diagnostic_report",
    "document_reference",
]
