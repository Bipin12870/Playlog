import pandas as pd
import json
from surprise import Dataset, Reader, SVD

# 1. Load your interaction data
df = pd.read_csv("data/interactions.csv")  # expects columns: user_id, game_id, rating

# 2. Setup Surprise with your rating scale
# Change (1, 10) to (1, 5) if you use 1–5 stars in your app
reader = Reader(rating_scale=(1, 10))

data = Dataset.load_from_df(df[["user_id", "game_id", "rating"]], reader)
trainset = data.build_full_trainset()

# 3. Train an SVD model (matrix factorisation = real ML)
model = SVD()
model.fit(trainset)

def get_top_n_for_user(model, trainset, raw_user_id, n=10):
    # If user not seen in training data, return empty list
    if raw_user_id not in trainset._raw2inner_id_users:
        return []

    inner_uid = trainset.to_inner_uid(raw_user_id)

    all_item_inner_ids = list(trainset.all_items())
    all_item_raw_ids = [trainset.to_raw_iid(iid) for iid in all_item_inner_ids]

    # Items the user already rated
    rated_inner = [j for (j, _) in trainset.ur[inner_uid]]
    rated_raw = [trainset.to_raw_iid(j) for j in rated_inner]

    candidates = []
    for raw_iid in all_item_raw_ids:
        if raw_iid in rated_raw:
            continue

        est_rating = model.predict(raw_user_id, raw_iid).est
        candidates.append((raw_iid, est_rating))

    # Sort by predicted rating, highest first
    candidates.sort(key=lambda x: x[1], reverse=True)

    return candidates[:n]

# 4. Build recommendations for all users in the data
all_users = df["user_id"].unique()
recommendations = {}

for user in all_users:
    recs = get_top_n_for_user(model, trainset, user, n=10)
    recommendations[user] = [
        {"game_id": game_id, "score": float(score)}
        for game_id, score in recs
    ]

# 5. Save recommendations to JSON (your app will read this)
with open("recommendations.json", "w") as f:
    json.dump(recommendations, f, indent=2)

print("Done. Saved recommendations for", len(all_users), "users")
