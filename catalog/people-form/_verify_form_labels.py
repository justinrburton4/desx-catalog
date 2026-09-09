"""Quick checks that live form labels resolve correctly."""
import re

GROUP_FROM_ROLE = {
    "Lab Directors": "directors",
    "Ph. D. Students": "phd",
    "Ph. D. Candidate": "phd",
    "Ph.D. Students": "phd",
    "Ph.D. Candidate": "phd",
    "Master's Students": "masters",
    "Undergraduate Students": "undergraduate",
}
DEFAULT_TITLE = {
    "directors": "Lab Co-director",
    "phd": "Ph.D. Student",
    "masters": "Master's Student",
    "undergraduate": "Undergraduate Student",
}


def normalize_role(role: str) -> str:
    return re.sub(r"\s+", " ", role.lower().replace(".", "")).strip()


def resolve_group(role: str):
    if role in GROUP_FROM_ROLE:
        return GROUP_FROM_ROLE[role]
    lower = normalize_role(role)
    if "director" in lower:
        return "directors"
    if "phd" in lower or "ph d" in lower:
        return "phd"
    if "master" in lower:
        return "masters"
    if "undergrad" in lower:
        return "undergraduate"
    return None


def default_title(role: str, group: str) -> str:
    lower = normalize_role(role)
    if "candidate" in lower:
        return "Ph.D. Candidate"
    if "director" in lower:
        return "Lab Co-director"
    return DEFAULT_TITLE[group]


def resolve_status(raw: str, fallback: str = "current") -> str:
    v = (raw or "").strip().lower()
    if not v:
        return fallback
    if "alumni" in v or "former" in v:
        return "alumni"
    if "current" in v:
        return "current"
    return fallback


def resolve_hidden(raw: str, fallback: bool = False) -> bool:
    v = (raw or "").strip().lower()
    if not v:
        return fallback
    if v in ("yes", "true", "hide") or "hide" in v:
        return True
    if v in ("no", "false") or "show" in v:
        return False
    return fallback


def alumni_title(existing: str, role: str, group: str) -> str:
    base = (existing or default_title(role, group)).strip()
    base = re.sub(r"(?i)^former\s+", "", base)
    return "Former " + base


def main() -> None:
    roles = [
        "Ph. D. Candidate",
        "Ph. D. Students",
        "Master's Students",
        "Undergraduate Students",
    ]
    for r in roles:
        g = resolve_group(r)
        print(r, "->", g, "|", default_title(r, g))
        assert g is not None

    assert resolve_group("Ph. D. Candidate") == "phd"
    assert default_title("Ph. D. Candidate", "phd") == "Ph.D. Candidate"
    assert resolve_status("Alumni") == "alumni"
    assert resolve_status("Current") == "current"
    assert resolve_status("") == "current"
    assert resolve_hidden("Yes") is True
    assert resolve_hidden("No") is False
    assert resolve_hidden("") is False
    assert alumni_title("Ph.D. Candidate", "Ph. D. Candidate", "phd") == "Former Ph.D. Candidate"

    # Form question titles we must recognize
    titles = {
        "Full Name": "Justin Burton",
        "Role": "Ph. D. Candidate",
        "Title": "",
        "Personal URL": "https://www.linkedin.com/in/justinrburton/",
        "Current lab member or Alumni": "Alumni",
        "Hide this profile?": "No",
    }
    assert titles["Personal URL"]
    assert resolve_status(titles["Current lab member or Alumni"]) == "alumni"
    assert resolve_hidden(titles["Hide this profile?"]) is False
    print("All checks passed")


if __name__ == "__main__":
    main()
