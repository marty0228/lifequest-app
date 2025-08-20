import "dotenv/config";
import app from "./app";

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`API ready on http://localhost:${PORT}`));