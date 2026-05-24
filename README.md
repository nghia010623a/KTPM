# Project Management System Frontend

Frontend tinh bang HTML/CSS/JS thuan, goi backend Java REST API bang `fetch` va nhan thong bao realtime bang WebSocket/STOMP.

Backend Spring Boot da duoc tao trong thu muc `backend/`. Xem huong dan chay chi tiet tai `backend/README.md`.

## Chay frontend

```bash
python3 -m http.server 5173
```

Mo:

```text
http://localhost:5173
```

## Cau hinh backend

Trong man hinh dang nhap hoac tab `Cau hinh`, sua:

- `API Base URL`: mac dinh `http://localhost:8080/api`
- `WebSocket URL`: mac dinh `http://localhost:8080/ws/notifications`
- `WebSocket mode`: mac dinh `stomp`, co the doi sang `native` neu backend co native WebSocket rieng

JWT phai co mot trong cac claim sau:

```json
{
  "role": "PROJECT_MANAGER"
}
```

Hoac:

```json
{
  "roles": ["ROLE_DEVELOPER"]
}
```

Frontend chap nhan cac role:

- `PROJECT_MANAGER`
- `DEVELOPER`
- `TESTER`
- `BA`
- `GUEST`

## Endpoint dang duoc goi

Neu backend cua ban khac ten path, sua object `ENDPOINTS` trong `app.js`.

| Method | Path | Dung cho |
| --- | --- | --- |
| POST | `/auth/login` | Dang nhap, tra ve `accessToken`, `token`, hoac `jwt` |
| GET | `/users` | Select nguoi lam / quan ly |
| GET | `/projects` | Danh sach du an |
| POST | `/projects` | Tao du an |
| PUT | `/projects/{id}` | Sua du an |
| DELETE | `/projects/{id}` | Xoa du an |
| GET | `/tasks` | Danh sach cong viec |
| POST | `/tasks` | Tao cong viec |
| PUT | `/tasks/{id}` | Sua cong viec / hoan thanh |
| DELETE | `/tasks/{id}` | Xoa cong viec |
| GET | `/resources` | Danh sach tai nguyen |
| POST | `/resources` | Them tai nguyen |
| PUT | `/resources/{id}` | Sua tai nguyen |
| DELETE | `/resources/{id}` | Xoa tai nguyen |
| GET | `/reports/summary` | Bao cao tong hop, neu co |
| GET | `/notifications` | Danh sach thong bao |
| PATCH | `/notifications/{id}/read` | Danh dau da doc |

## Phan quyen frontend

RBAC nam trong `ROLE_PERMISSIONS` cua `app.js`.

- `PROJECT_MANAGER`: toan quyen du an, task, tai nguyen, ngan sach, bao cao, thong bao.
- `DEVELOPER`: xem du an, tao task code/bug, cap nhat task duoc gan, xem tai nguyen khong hien chi phi, xem bao cao tien do.
- `TESTER`: xem du an, tao/sua bug va test case, cap nhat task duoc gan, xem bao cao tien do/chat luong.
- `BA`: xem du an, tao task requirement, sua requirement, xem tai nguyen khong hien chi phi, xem bao cao tien do/tai nguyen.
- `GUEST`: chi xem du an, task, thong bao va ma tran quyen.

Frontend da:

- Giai ma JWT va doc `role`, `roles`, `authorities`, `scope`.
- An menu/nut/form field khong dung quyen.
- Chan action truoc khi goi API bang `guard()` va `canEditTask()`.
- Khong fetch module ma role khong co quyen xem.
- An cot ngan sach/chi phi voi role khong co finance permission.

Backend van phai validate JWT va permission o tung endpoint. Frontend chi la lop trai nghiem va khong thay the bao mat server.
