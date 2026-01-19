## Deploy

```bash
gcloud functions deploy zetoApi \
  --entry-point=playtimeapi \
  --runtime=nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --region=europe-west1 \
  --gen2
```
