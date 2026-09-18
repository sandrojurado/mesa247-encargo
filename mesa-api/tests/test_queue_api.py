from fastapi.testclient import TestClient


def test_list_locations_returns_seeded_locations(client: TestClient) -> None:
    response = client.get("/api/locations")

    assert response.status_code == 200
    locations = response.json()
    assert isinstance(locations, list)
    assert locations
    for location in locations:
        assert {"id", "name"} <= location.keys()
        assert isinstance(location["id"], int)
        assert location["name"]


def test_post_queue_creates_valid_entry(client: TestClient) -> None:
    location_id = client.get("/api/locations").json()[0]["id"]

    response = client.post(
        "/api/queue",
        json={
            "location_id": location_id,
            "name": "Ana Torres",
            "phone": "+51 987 654 321",
            "party_size": 4,
        },
    )

    assert response.status_code == 201
    queue_entry = response.json()
    assert isinstance(queue_entry["id"], int)
    assert queue_entry["location_id"] == location_id
    assert queue_entry["location_name"]
    assert queue_entry["customer_name"] == "Ana Torres"
    assert queue_entry["phone"] == "+51987654321"
    assert queue_entry["party_size"] == 4
    assert queue_entry["status"] == "WAITING"
    assert queue_entry["position"] == 1
    assert isinstance(queue_entry["elapsed_seconds"], int)

    fetched = client.get(f"/api/queue/{queue_entry['id']}")
    assert fetched.status_code == 200
    assert fetched.json() == queue_entry


def test_post_queue_rejects_invalid_payloads(client: TestClient) -> None:
    location_id = client.get("/api/locations").json()[0]["id"]
    valid_payload = {
        "location_id": location_id,
        "name": "Ana Torres",
        "phone": "+51 987 654 321",
        "party_size": 4,
    }

    invalid_cases = [
        ({"name": None}, 422),
        ({"phone": "not-a-phone"}, 422),
        ({"location_id": 999_999}, 404),
        ({"party_size": 0}, 422),
        ({"party_size": 13}, 422),
    ]
    for override, expected_status in invalid_cases:
        payload = valid_payload | override
        response = client.post("/api/queue", json=payload)
        assert response.status_code == expected_status


def test_get_queue_returns_existing_entry(client: TestClient) -> None:
    location_id = client.get("/api/locations").json()[0]["id"]
    created = client.post(
        "/api/queue",
        json={
            "location_id": location_id,
            "name": "Luis Ramos",
            "phone": "987654322",
            "party_size": 2,
        },
    ).json()

    response = client.get(f"/api/queue/{created['id']}")

    assert response.status_code == 200
    queue_entry = response.json()
    assert queue_entry["id"] == created["id"]
    assert queue_entry["status"] == "WAITING"
    assert queue_entry["customer_name"] == "Luis Ramos"
    assert queue_entry["location_id"] == location_id
    assert queue_entry["location_name"]
    assert queue_entry["position"] == 1
    assert isinstance(queue_entry["elapsed_seconds"], int)


def test_get_queue_returns_404_for_missing_entry(client: TestClient) -> None:
    response = client.get("/api/queue/999999")

    assert response.status_code == 404
