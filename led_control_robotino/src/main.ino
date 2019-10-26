#include <Arduino.h>
#include <FastLED.h>

#define NUM_LEDS 15
#define DATA_PIN 2

CRGB leds[NUM_LEDS];

// String data[2];
// String buf = "";
char buf[50] = {0};
byte bufIdx = 0;
bool newDataAvailable = false;

void setup()
{
  Serial.begin(115200);
  Serial.println("LED_Control");
  FastLED.addLeds<WS2811, DATA_PIN, BRG>(leds, NUM_LEDS); // put your setup code here, to run once:
}

void ledMap(uint32_t color, int ledcount)
{
  FastLED.clear();
  ledcount = map(ledcount, 0, 100, 0, 15);
  for (int i = 0; i <= ledcount; i++)
  {
    leds[i] = color;
  }
}
void loop()
{

  if (Serial.available())
  {

    char c = Serial.read();
    if (c == '\n')
    {
      // buf = "";
      newDataAvailable = true;
    }
    else
    {
      buf[bufIdx] = c;
      bufIdx++;
    }
  }

  if (newDataAvailable)
  {

    newDataAvailable = false;

    Serial.println(buf);
    uint32_t value;
    int value1;
    sscanf(buf, "%06lX,%d", &value, &value1);
    // int value1 = 20;
    // sscanf(data[1].c_str(), "%3d", &value1);
    // 
    ledMap(value, value1);
    FastLED.show();

    Serial.print("data0: ");
    Serial.println(value);
    Serial.print("data1: ");
    Serial.println(value1);

    bufIdx = 0;
    memset(buf, 0, sizeof(buf));
  }
}