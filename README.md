# ByteBud

ByteBud is a React storefront with a Node.js/Express API and MongoDB Atlas database.

## Run locally

Install the frontend dependencies from the project root and start Vite:

```powershell
npm install
npm run dev
```

Configure the backend in `server/.env` (keep this file private):

```dotenv
MONGODB_URI=mongodb+srv://<database-user>:<password>@<cluster-host>/<database-name>
JWT_SECRET=<long-random-secret>
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
```

Then install and start the backend from `server/`:

```powershell
cd server
npm install
npm run seed
npm run dev
```

`npm run seed` can also be run from the project root; it forwards the command to `server/`.
The seed creates the demo admin, partner-school lookup records, courses, laptop models, a demo acquisition, and demo laptop units. The sample acquisition costs are zero and are not real financial data.

## Storefront and staff workflows

- Guests land on the storefront and can browse the catalog and laptop details. Selecting **Reserve and add to cart** prompts guests to log in or sign up, then returns them to the same laptop.
- The storefront header shows **Log in** and **Sign up** for guests. Buyers get a **My account** menu, while staff and admins get **Dashboard**. The ByteBud logo is shared across the storefront, authentication screens, and admin console.
- The buyer account greets the buyer by name and shows a student discount pill beside the greeting. Active verification gets a green check, pending proof shows **Under review**, and other buyers can open **Student Verification** from the reminder. Orders show **Order status** and **Payment status** in separate columns.
- Staff and admins can view student proof inline, approve it with an expiry date, or confirm rejection with an optional reason. The Orders and Student verifications tables use status pills, and order details open in a centered modal.

## GCash and bank transfer setup

Add `VITE_GCASH_ACCOUNT_NAME` and `VITE_GCASH_ACCOUNT_NUMBER` to the frontend `.env` at the project root. To show a merchant QR code, put the image in `public/` and set `VITE_GCASH_QR_URL` to its public path, such as `/gcash-qr.png`. The account name plus either the number or QR code enables the payment card. These values are visible to buyers. Restart Vite or rebuild the production bundle after changing them.

For bank transfer, set `VITE_BANK_NAME`, `VITE_BANK_ACCOUNT_NAME`, and `VITE_BANK_ACCOUNT_NUMBER` in the same frontend `.env`. Use the receiving account details you want buyers to see.

Buyers see the payment card after placing an order and can reopen it under **My account → Orders**. Staff and admins can open the order in **Orders & After-Sales** and mark it paid after matching the submitted reference and total against the received transfer.

## Data model

`server/models.js` defines the MongoDB collections and embedded objects from the ByteBud ERD:

- `users`, `student_verifications`, and `password_resets`
- `suppliers`, `acquisitions`, `laptop_models`, `units`, and `courses`
- `carts`, `orders`, `warranties`, and `audit_logs`

The ERD's named IDs are stored as MongoDB `_id` values. References use ObjectIds, and nested structures such as laptop specs, order items, inspections, and warranty claims are embedded documents.

The `schools` collection helps the backend check partner school email domains. The API serves the public catalog and handles authentication, password resets, cart reservations, orders, payment references, student verification, returns, warranty claims, inventory management, and audit logs.
