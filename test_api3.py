import requests
res = requests.post("http://localhost:8080/api/auth/login", json={"email": "demo@student.finally", "password": "Demo@1234"})
token = res.json().get("token")
headers = {"Authorization": f"Bearer {token}"}
print(requests.get("http://localhost:8080/api/score/current", headers=headers).text)
