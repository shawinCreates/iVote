
```
iVote
├─ backend
│  ├─ app
│  │  ├─ core
│  │  │  ├─ config.py
│  │  │  ├─ crypto.py
│  │  │  └─ security.py
│  │  ├─ db
│  │  │  ├─ database.py
│  │  │  ├─ models.py
│  │  │  └─ __init__.py
│  │  ├─ main.py
│  │  ├─ routers
│  │  │  ├─ auth.py
│  │  │  ├─ candidates.py
│  │  │  ├─ elections.py
│  │  │  ├─ results.py
│  │  │  ├─ users.py
│  │  │  ├─ voting.py
│  │  │  └─ __init__.py
│  │  ├─ schemas
│  │  │  └─ schemas.py
│  │  ├─ services
│  │  │  ├─ audit_notification_service.py
│  │  │  ├─ auth_services.py
│  │  │  ├─ candidate_service.py
│  │  │  ├─ election_service.py
│  │  │  ├─ he_tally_service.py
│  │  │  ├─ result_service.py
│  │  │  ├─ schedular_service.py
│  │  │  ├─ voting_service.py
│  │  │  └─ __init__.py
│  │  ├─ uploads
│  │  │  └─ id_cards
│  │  │     └─ idcard_BIT-130.png
│  │  ├─ utils
│  │  │  ├─ dependencies.py
│  │  │  └─ helpers.py
│  │  └─ __init__.py
│  ├─ README.md
│  └─ requirements.txt
├─ frontend
│  ├─ static
│  │  ├─ css
│  │  │  └─ style.css
│  │  └─ js
│  │     └─ main.js
│  └─ templates
│     ├─ admin
│     │  ├─ audit.html
│     │  ├─ candidates.html
│     │  ├─ dashboard.html
│     │  ├─ elections.html
│     │  ├─ results.html
│     │  └─ students.html
│     ├─ base.html
│     ├─ base_app.html
│     ├─ login.html
│     ├─ register.html
│     └─ student
│        ├─ candidacy.html
│        ├─ candidates.html
│        ├─ dashboard.html
│        ├─ results.html
│        └─ vote.html
├─ LICENSE
└─ uploads
   └─ id_cards

```
```
iVote
├─ LICENSE
├─ README.md
├─ backend
│  ├─ README.md
│  ├─ app
│  │  ├─ __init__.py
│  │  ├─ core
│  │  │  ├─ config.py
│  │  │  ├─ crypto.py
│  │  │  └─ security.py
│  │  ├─ db
│  │  │  ├─ __init__.py
│  │  │  ├─ database.py
│  │  │  └─ models.py
│  │  ├─ main.py
│  │  ├─ routers
│  │  │  ├─ __init__.py
│  │  │  ├─ auth.py
│  │  │  ├─ candidates.py
│  │  │  ├─ elections.py
│  │  │  ├─ results.py
│  │  │  ├─ users.py
│  │  │  └─ voting.py
│  │  ├─ schemas
│  │  │  └─ schemas.py
│  │  ├─ services
│  │  │  ├─ __init__.py
│  │  │  ├─ audit_notification_service.py
│  │  │  ├─ auth_services.py
│  │  │  ├─ candidate_service.py
│  │  │  ├─ election_service.py
│  │  │  ├─ he_tally_service.py
│  │  │  ├─ result_service.py
│  │  │  ├─ schedular_service.py
│  │  │  └─ voting_service.py
│  │  └─ utils
│  │     ├─ dependencies.py
│  │     └─ helpers.py
│  ├─ init_db.py
│  └─ requirements.txt
└─ frontend
   ├─ static
   │  ├─ css
   │  │  └─ style.css
   │  └─ js
   │     └─ main.js
   └─ templates
      ├─ admin
      │  ├─ audit.html
      │  ├─ candidates.html
      │  ├─ dashboard.html
      │  ├─ elections.html
      │  ├─ results.html
      │  └─ students.html
      ├─ base.html
      ├─ base_app.html
      ├─ login.html
      ├─ register.html
      └─ student
         ├─ candidacy.html
         ├─ candidates.html
         ├─ dashboard.html
         ├─ results.html
         └─ vote.html

```
```
iVote
├─ LICENSE
├─ README.md
├─ backend
│  ├─ README.md
│  ├─ app
│  │  ├─ __init__.py
│  │  ├─ core
│  │  │  ├─ config.py
│  │  │  ├─ crypto.py
│  │  │  ├─ email_service.py
│  │  │  ├─ paillier.py
│  │  │  └─ security.py
│  │  ├─ db
│  │  │  ├─ __init__.py
│  │  │  ├─ database.py
│  │  │  └─ models.py
│  │  ├─ main.py
│  │  ├─ routers
│  │  │  ├─ __init__.py
│  │  │  ├─ auth.py
│  │  │  ├─ candidates.py
│  │  │  ├─ elections.py
│  │  │  ├─ results.py
│  │  │  ├─ users.py
│  │  │  └─ voting.py
│  │  ├─ schemas
│  │  │  └─ schemas.py
│  │  ├─ services
│  │  │  ├─ __init__.py
│  │  │  ├─ audit_notification_service.py
│  │  │  ├─ auth_services.py
│  │  │  ├─ candidate_service.py
│  │  │  ├─ election_service.py
│  │  │  ├─ he_tally_service.py
│  │  │  ├─ result_service.py
│  │  │  ├─ schedular_service.py
│  │  │  └─ voting_service.py
│  │  └─ utils
│  │     ├─ dependencies.py
│  │     └─ helpers.py
│  ├─ init_db.py
│  └─ requirements.txt
└─ frontend
   ├─ static
   │  ├─ css
   │  │  └─ style.css
   │  ├─ images
   │  │  └─ default_avatar.jpg
   │  └─ js
   │     └─ main.js
   └─ templates
      ├─ admin
      │  ├─ audit.html
      │  ├─ candidates.html
      │  ├─ dashboard.html
      │  ├─ elections.html
      │  ├─ results.html
      │  └─ students.html
      ├─ base.html
      ├─ base_app.html
      ├─ forgot_password.html
      ├─ login.html
      ├─ register.html
      ├─ reset_password.html
      ├─ student
      │  ├─ candidacy.html
      │  ├─ candidates.html
      │  ├─ dashboard.html
      │  ├─ results.html
      │  └─ vote.html
      └─ terms.html

```