from service.rag import load_model
import logging
import threading

import uvicorn

logging.basicConfig(level=logging.INFO)

if __name__ == "__main__":
    from service.rag_server import app
    from worker.consumer import start

    load_model()

    server_thread = threading.Thread(
        target=uvicorn.run,
        args=(app,),
        kwargs={"host": "0.0.0.0", "port": 8000, "log_level": "info"},
        daemon=True,
    )
    server_thread.start()

    start()
    
