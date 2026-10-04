from backend.main import AnalyzePlaceRequest, generate_smart_place_insights


def test_generate_smart_place_insights_uses_custom_question():
    req = AnalyzePlaceRequest(
        lat=26.4600,
        lon=80.3400,
        place_name="Kanpur",
        city="Kanpur",
        state="Uttar Pradesh",
        country="India",
        custom_question="Tell me about the historical places in Kanpur",
        language="en",
    )

    data = generate_smart_place_insights(req, "Kanpur, Kanpur, Uttar Pradesh, India", "You are standing at Kanpur.")

    summary = (data["summary"] or "").lower()
    question = "historical places in kanpur".lower()
    assert question in summary or question in " ".join(data["history_facts"]).lower()


def test_generate_smart_place_insights_keeps_place_name_exact():
    req = AnalyzePlaceRequest(
        lat=26.4600,
        lon=80.3400,
        place_name="Kanpur",
        city="Kanpur",
        state="Uttar Pradesh",
        country="India",
        custom_question="What is famous here?",
        language="hi",
    )

    data = generate_smart_place_insights(req, "Kanpur, Kanpur, Uttar Pradesh, India", "Aap abhi Kanpur par khade hain.")

    assert "Kanpur" in data["place_title"]
    assert "Kanpur" in data["hindi_announcement"]
