import logging

logger = logging.getLogger("test")
logger.setLevel(logging.INFO)
fh = logging.FileHandler("test.log", encoding="utf-8")
fh.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
fh.setFormatter(formatter)
logger.addHandler(fh)

print("Writing to log")
logger.info("🚀 TEST WITH EMOJI")
print("Done")
