# Google Cloud setup

contact-fuse needs permission from Google to read and update your contacts. Because contact-fuse is open source and runs on **your** computer, you create your **own** free "OAuth client" in Google Cloud. This means:

- No company or server sits between you and Google. Only your computer talks to your Google accounts.
- You don't need to trust a third party with your contacts.
- It's free. No billing account or credit card is needed.

**Time needed:** about 10 minutes, once. Why we do it this way: [ADR 0006](../adr/0006-user-owned-google-oauth-client.md).

> **Use your main Google account** (or any account you like) to create the project. You'll add _every_ account you want to connect as a "test user" in step 4.

---

## Step 1: Create a Google Cloud project

1. Go to <https://console.cloud.google.com/> and sign in.
2. If asked, accept the Terms of Service.
3. At the top left, click the **project picker** (it may say "Select a project"), then **New project**.
4. **Project name:** `contact-fuse` (any name works). Leave **Location** as is.
5. Click **Create**, wait a few seconds, then make sure the new project is selected in the project picker.

![The New project form with the name contact-fuse](../assets/google-cloud/step-1.png)

## Step 2: Enable the People API

1. Open <https://console.cloud.google.com/apis/library/people.googleapis.com> (or search **"People API"** in the top search bar).
2. Check that your `contact-fuse` project is selected at the top.
3. Click **Enable**.

![People API page with the Enable button](../assets/google-cloud/step-2.png)

## Step 3: Configure the OAuth consent screen

This is the screen you'll see when contact-fuse asks to access your contacts.

1. Go to **APIs & Services → OAuth consent screen** (Google may call this section **Google Auth Platform → Branding**).
2. Click **Get started** (or **Configure consent screen**).
3. **App information:**
   - **App name:** `contact-fuse (local)`
   - **User support email:** your email
4. **Audience:** choose **External**. ("Internal" is only available to Google Workspace organisations.)
5. **Contact information:** your email.
6. Accept the policy and click **Create**.

![Consent screen app information](../assets/google-cloud/step-3.png)

> Leave the app in **Testing** status. Do **not** click **Publish app**. Publishing would require Google's verification process, which is meant for public apps.

## Step 4: Add test users

In Testing mode, only accounts on this list can sign in.

1. Go to **OAuth consent screen → Audience** (older layout: **Test users** section on the consent screen page).
2. Under **Test users**, click **Add users**.
3. Enter **every Google account you want to connect** to contact-fuse, one per line (for example `me@gmail.com`, `me.work@gmail.com`, `old.me@gmail.com`).
4. Click **Save**.

![Adding test users](../assets/google-cloud/step-4.png)

You can add more later. If you forget one, signing in with that account shows "Access blocked", and you can come back here to fix it.

## Step 5: Create the OAuth client (Desktop app)

1. Go to **APIs & Services → Credentials** (or **Google Auth Platform → Clients**).
2. Click **Create credentials → OAuth client ID** (or **Create client**).
3. **Application type:** **Desktop app**. This matters: contact-fuse uses the desktop sign-in flow.
4. **Name:** `contact-fuse`.
5. Click **Create**.
6. A dialog shows your **Client ID** and **Client secret**. Click **Download JSON** or copy both values somewhere safe for the next step.

![Create OAuth client ID with Desktop app selected](../assets/google-cloud/step-5.png)

> **Is the "client secret" really secret?** For desktop apps, Google treats it as not truly confidential, and security relies on the sign-in happening on your own computer (with PKCE). Still, don't post it publicly. contact-fuse stores it in your Mac's Keychain.

## Step 6: Paste the credentials into contact-fuse

1. Start contact-fuse (`npx contact-fuse`) and the browser opens.
2. On the **Connect contact-fuse to Google** step (or **Settings → Google**), paste:
   - **Client ID:** ends with `.apps.googleusercontent.com`
   - **Client secret:** starts with `GOCSPX-`
3. Click **Save**.
4. Click **Connect Google account** and sign in.

![contact-fuse Google settings form](../assets/google-cloud/step-6.png)

## Step 7: The sign-in warning

Because your app is in Testing mode and unverified, Google shows **"Google hasn't verified this app"**. This is expected: you are the developer of this app.

1. Check that the app name is the one you entered (`contact-fuse (local)`).
2. Click **Continue**.
3. Tick the permission box ("See and download your contacts"), then click **Continue**. If you leave it unticked, contact-fuse cannot connect and nothing is saved.

![Unverified app warning with the Continue link](../assets/google-cloud/step-7.png)

Repeat **Connect Google account** for each of your accounts.

---

## Permissions contact-fuse asks for

| Scope                                                                | Why                                                                                                        |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `https://www.googleapis.com/auth/contacts.readonly`                  | Read your contacts to back them up and find duplicates. This is all contact-fuse asks for when you connect |
| `https://www.googleapis.com/auth/contacts`                           | Create, update, label or delete contacts. Asked for **later**, only when you first apply a merge           |
| `https://www.googleapis.com/auth/contacts.other.readonly` (optional) | Read "Other contacts" (addresses Gmail saved automatically), only if you turn this on in Settings          |
| `openid`, `email`                                                    | Show which account is connected                                                                            |

## Limits of Testing mode

| Limit                            | What it means for you                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Sign-ins expire after 7 days** | Google revokes access for Testing apps after 7 days. contact-fuse will ask you to **Sign in again**. Your data and settings are kept. |
| **Up to 100 test users**         | More than enough for personal use                                                                                                     |
| **"Unverified app" warning**     | Shown at each sign-in. Expected, see step 7.                                                                                          |
| **API quotas**                   | Generous for personal use. contact-fuse automatically slows down if Google asks it to.                                                |

## Removing access

- **In contact-fuse:** **Accounts → Disconnect** revokes the token and deletes it from your Keychain.
- **In Google:** <https://myaccount.google.com/connections> → **contact-fuse (local)** → **Delete all connections**.
- **Delete the whole project:** Google Cloud console → **IAM & Admin → Settings → Shut down**.

## Problems?

See [troubleshooting](troubleshooting.md#google-sign-in), in particular:

- "Access blocked: contact-fuse (local) has not completed the Google verification process" → the account isn't a test user (step 4).
- `invalid_client` → wrong client ID/secret, or the client type isn't **Desktop app** (step 5).
- "People API has not been used in project…" → step 2 was skipped, or a different project is selected.

> Google occasionally renames menu items in the Cloud console. If a label here doesn't match what you see, the closest equivalent works the same. Please open a docs issue so we can update this guide.
