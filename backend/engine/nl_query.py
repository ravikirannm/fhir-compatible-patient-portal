import logging
import json
import re
from typing import Dict, Tuple, Optional
import requests

from constants import OLLAMA_URL, OLLAMA_MODEL
from engine.prompt_templates import create_prompt
from engine.validators import validator
from engine.fhir_proxy import fhir_proxy

logger = logging.getLogger(__name__)


class NLQueryEngine:
    """Translates natural language queries to FHIR search parameters"""

    def __init__(self, ollama_url: str = OLLAMA_URL, model: str = OLLAMA_MODEL):
        self.ollama_url = ollama_url.rstrip("/")
        self.model = model

    def translate(self, query: str) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Translate natural language query to FHIR search parameters

        Args:
            query: Natural language clinical query

        Returns:
            (parsed_output, error_message) - One will be None if successful
        """
        # Create prompt with few-shot examples
        prompt = create_prompt(query)

        # Call Ollama LLM
        llm_output = self._call_ollama(prompt)
        if not llm_output:
            return None, "Failed to get response from LLM"

        # Parse JSON output
        parsed_output = self._parse_json_output(llm_output)
        if not parsed_output:
            return None, f"Failed to parse LLM response as JSON: {llm_output[:100]}..."

        # Validate output structure
        is_valid, error = validator.validate_nl_query_output(parsed_output)
        if not is_valid:
            return None, f"Validation error: {error}"

        return parsed_output, None

    def execute_translated_query(self, translated_query: Dict) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Execute a translated FHIR query

        Args:
            translated_query: Dictionary with resource_type and search_params

        Returns:
            (results, error_message)
        """
        try:
            resource_type = translated_query.get("resource_type")
            search_params = translated_query.get("search_params", {})

            # Execute the FHIR search
            results = fhir_proxy.search_resources(resource_type, search_params)

            if not results:
                return None, f"No results found or error querying FHIR server"

            return results, None

        except Exception as e:
            logger.error(f"Error executing translated query: {e}")
            return None, str(e)

    def _call_ollama(self, prompt: str) -> Optional[str]:
        """Call Ollama API to get LLM response"""
        try:
            url = f"{self.ollama_url}/api/generate"
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "temperature": 0.2,  # Lower temperature for more consistent output
            }

            response = requests.post(url, json=payload, timeout=30)
            response.raise_for_status()

            data = response.json()
            return data.get("response", "").strip()

        except requests.RequestException as e:
            logger.error(f"Error calling Ollama API: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error calling Ollama: {e}")
            return None

    def _parse_json_output(self, text: str) -> Optional[Dict]:
        """
        Parse JSON from LLM output

        The LLM might return JSON wrapped in code blocks or other text,
        so we extract the JSON object from the response.
        """
        try:
            # Try direct JSON parsing first
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Try to extract JSON from markdown code blocks
        match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        # Try to extract any JSON object from the text
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass

        return None


# Global NL query engine instance
nl_engine = NLQueryEngine()
