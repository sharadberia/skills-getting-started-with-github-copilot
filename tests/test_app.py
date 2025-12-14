import os
import sys

# Ensure src directory is on path so we can import app.py
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC_PATH = os.path.join(ROOT, 'src')
if SRC_PATH not in sys.path:
    sys.path.insert(0, SRC_PATH)

from fastapi.testclient import TestClient
from app import app

client = TestClient(app)


def test_get_activities():
    res = client.get('/activities')
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    # Expect some known activity to be present
    assert 'Soccer Team' in data


def test_signup_and_prevent_duplicate():
    email = 'testuser@example.com'
    activity = 'Soccer Team'
    # Ensure not present initially
    res = client.get('/activities')
    assert res.status_code == 200
    participants = res.json()[activity]['participants']
    if email in participants:
        # remove to make test deterministic
        client.delete(f"/activities/{activity}/participants?email={email}")

    # Signup should succeed
    res = client.post(f"/activities/{activity}/signup?email={email}")
    assert res.status_code == 200

    # Signup again should fail with 400
    res = client.post(f"/activities/{activity}/signup?email={email}")
    assert res.status_code == 400

    # Cleanup
    res = client.delete(f"/activities/{activity}/participants?email={email}")
    assert res.status_code == 200


def test_remove_nonexistent_participant():
    res = client.delete('/activities/Soccer Team/participants?email=nonexistent@example.com')
    # If not present, API returns 404
    assert res.status_code in (404, 200)
