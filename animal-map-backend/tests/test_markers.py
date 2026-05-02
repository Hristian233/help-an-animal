import re


def is_uuid_like(value: str) -> bool:
    return bool(
        re.fullmatch(
            r"[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}",
            value,
            flags=re.IGNORECASE,
        )
    )


def test_get_all_markers_returns_list(client):
    response = client.get("/markers/all")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_create_marker(client):
    payload = {
        "animal": "Cat",
        "key_info": "Found near park",
        "lat": 52.52,
        "lng": 13.405,
    }
    response = client.post("/markers", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert is_uuid_like(data["id"])
    assert data["animal"] == "Cat"
    assert data["key_info"] == "Found near park"
    assert data["lat"] == 52.52
    assert data["lng"] == 13.405
    assert "created_at" in data
    assert "updated_at" in data


def test_create_then_get_all(client):
    payload1 = {"animal": "Dog", "lat": 52.53, "lng": 13.41}
    payload2 = {"animal": "Bird", "key_info": "In tree", "lat": 52.51, "lng": 13.40}
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
    assert all(is_uuid_like(marker_id) for marker_id in ids)


def test_update_marker(client):
    create_resp = client.post(
        "/markers",
        json={"animal": "Cat", "key_info": "Original", "lat": 52.0, "lng": 13.0},
    )
    assert create_resp.status_code == 200
    marker_id = create_resp.json()["id"]

    update_resp = client.patch(
        f"/markers/{marker_id}",
        json={"key_info": "Updated note"},
    )
    assert update_resp.status_code == 200
    data = update_resp.json()
    assert data["key_info"] == "Updated note"
    assert data["animal"] == "Cat"
    assert data["lat"] == 52.0
    assert data["lng"] == 13.0


def test_update_marker_not_found(client):
    response = client.patch(
        "/markers/00000000-0000-4000-8000-000000000000",
        json={"key_info": "Should fail"},
    )
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_create_marker_validation(client):
    response = client.post(
        "/markers",
        json={"key_info": "No animal field", "lat": 52.52, "lng": 13.405},
    )
    assert response.status_code == 422


def test_get_marker_images_empty(client):
    create_resp = client.post(
        "/markers",
        json={"animal": "Cat", "lat": 52.0, "lng": 13.0},
    )
    assert create_resp.status_code == 200
    marker_id = create_resp.json()["id"]

    response = client.get(f"/markers/{marker_id}/images")
    assert response.status_code == 200
    data = response.json()
    assert data == {"total": 0, "items": []}


def test_get_marker_images_not_found(client):
    response = client.get("/markers/00000000-0000-4000-8000-000000000000/images")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_create_marker_image(client):
    create_resp = client.post(
        "/markers",
        json={"animal": "Cat", "lat": 52.0, "lng": 13.0},
    )
    marker_id = create_resp.json()["id"]

    add_resp = client.post(
        f"/markers/{marker_id}/images",
        json={"image_url": "https://example.com/extra.jpg"},
    )
    assert add_resp.status_code == 200
    body = add_resp.json()
    assert body["image_url"] == "https://example.com/extra.jpg"
    assert isinstance(body["id"], int)

    list_resp = client.get(f"/markers/{marker_id}/images")
    assert list_resp.status_code == 200
    items = list_resp.json()["items"]
    assert len(items) == 1
    assert items[0]["image_url"] == "https://example.com/extra.jpg"


def test_create_marker_image_marker_not_found(client):
    response = client.post(
        "/markers/00000000-0000-4000-8000-000000000000/images",
        json={"image_url": "https://example.com/x.jpg"},
    )
    assert response.status_code == 404


def _create_marker(client) -> str:
    resp = client.post("/markers", json={"animal": "Dog", "lat": 52.0, "lng": 13.0})
    assert resp.status_code == 200
    return resp.json()["id"]


def test_report_with_image_adds_to_gallery_for_feed_water_seen(client):
    for report_type in ("FEED", "WATER", "SEEN"):
        marker_id = _create_marker(client)
        url = f"https://example.com/{report_type.lower()}.jpg"

        report_resp = client.post(
            f"/markers/{marker_id}/reports",
            json={"type": report_type, "image_url": url},
        )
        assert report_resp.status_code == 200

        gallery = client.get(f"/markers/{marker_id}/images").json()["items"]
        assert len(gallery) == 1, f"{report_type} should add to gallery"
        assert gallery[0]["image_url"] == url


def test_report_with_photo_type_does_not_add_to_gallery(client):
    marker_id = _create_marker(client)
    report_resp = client.post(
        f"/markers/{marker_id}/reports",
        json={"type": "PHOTO", "image_url": "https://example.com/photo.jpg"},
    )
    assert report_resp.status_code == 200

    gallery = client.get(f"/markers/{marker_id}/images").json()["items"]
    assert gallery == []


def test_report_without_image_does_not_add_to_gallery(client):
    marker_id = _create_marker(client)
    report_resp = client.post(
        f"/markers/{marker_id}/reports",
        json={"type": "FEED", "text": "fed it"},
    )
    assert report_resp.status_code == 200

    gallery = client.get(f"/markers/{marker_id}/images").json()["items"]
    assert gallery == []


def test_marker_creation_with_image_does_not_populate_gallery(client):
    create_resp = client.post(
        "/markers",
        json={
            "animal": "Cat",
            "lat": 52.0,
            "lng": 13.0,
            "image_url": "https://example.com/cover.jpg",
        },
    )
    assert create_resp.status_code == 200
    marker_id = create_resp.json()["id"]

    gallery = client.get(f"/markers/{marker_id}/images").json()["items"]
    assert gallery == []


def test_get_marker_images_with_limit_returns_newest_first(client):
    marker_id = _create_marker(client)

    for i in range(6):
        add_resp = client.post(
            f"/markers/{marker_id}/images",
            json={"image_url": f"https://example.com/{i}.jpg"},
        )
        assert add_resp.status_code == 200

    response = client.get(f"/markers/{marker_id}/images?limit=4")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 6
    assert len(body["items"]) == 4
    assert body["items"][0]["image_url"] == "https://example.com/5.jpg"
    assert body["items"][3]["image_url"] == "https://example.com/2.jpg"


def test_get_marker_images_limit_validation(client):
    marker_id = _create_marker(client)

    too_low = client.get(f"/markers/{marker_id}/images?limit=0")
    assert too_low.status_code == 422

    too_high = client.get(f"/markers/{marker_id}/images?limit=51")
    assert too_high.status_code == 422
