def test_get_all_markers_returns_list(client):
    response = client.get("/markers/all")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_create_marker(client):
    payload = {
        "animal": "Cat",
        "note": "Found near park",
        "lat": 52.52,
        "lng": 13.405,
    }
    response = client.post("/markers", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["animal"] == "Cat"
    assert data["note"] == "Found near park"
    assert data["lat"] == 52.52
    assert data["lng"] == 13.405
    assert "created_at" in data
    assert "updated_at" in data


def test_create_then_get_all(client):
    payload1 = {"animal": "Dog", "lat": 52.53, "lng": 13.41}
    payload2 = {"animal": "Bird", "note": "In tree", "lat": 52.51, "lng": 13.40}
    create1 = client.post("/markers", json=payload1)
    create2 = client.post("/markers", json=payload2)
    assert create1.status_code == 200
    assert create2.status_code == 200
    marker1_id = create1.json()["id"]
    marker2_id = create2.json()["id"]

    response = client.get("/markers/all")
    assert response.status_code == 200
    markers = response.json()
    ids = {m["id"] for m in markers}
    assert marker1_id in ids
    assert marker2_id in ids


def test_update_marker(client):
    create_resp = client.post(
        "/markers",
        json={"animal": "Cat", "note": "Original", "lat": 52.0, "lng": 13.0},
    )
    assert create_resp.status_code == 200
    marker_id = create_resp.json()["id"]

    update_resp = client.patch(
        f"/markers/{marker_id}",
        json={"note": "Updated note"},
    )
    assert update_resp.status_code == 200
    data = update_resp.json()
    assert data["note"] == "Updated note"
    assert data["animal"] == "Cat"
    assert data["lat"] == 52.0
    assert data["lng"] == 13.0


def test_update_marker_not_found(client):
    response = client.patch(
        "/markers/99999",
        json={"note": "Should fail"},
    )
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_create_marker_validation(client):
    response = client.post(
        "/markers",
        json={"note": "No animal field", "lat": 52.52, "lng": 13.405},
    )
    assert response.status_code == 422
