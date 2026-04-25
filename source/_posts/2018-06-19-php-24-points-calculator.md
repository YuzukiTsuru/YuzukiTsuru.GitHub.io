---
title: php的24点计算器
tags: ['日志', 'blog', '博文']
date: 2018-06-19 00:00:00
---

最近学了PHP，又写了个24点计算器，采用2个页面。一个输入，一个输出。

```php
<html>
 <body>
 <title>24点计算器</title>
 <form action="2.php" method="post">
第一个<input type="text" name="a">
第二个<input type="text" name="b">
第三个<input type="text" name="c">
第四个<input type="text" name="d">
 <input type="submit">
</form>
 </body>
 </html>
```

```php
<html>
 <body>
 <title>计算结果</title>
<?php
error_reporting(E_ALL ^ E_NOTICE);   //关闭提醒

    $a = $_POST["a"];                //获得输入
    $b = $_POST["b"];
    $c = $_POST["c"];
    $d = $_POST["d"];

  set_time_limit(0);
  $values = array($a, $b, $c, $d);   //丢数组里
  $result = 24;

  $list = array();

  echo "<pre>";
  makeValue($values);
  print_r($list);

  function makeValue($values, $set=array())
  {
      $words = array("+", "-", "*", "/");
      if(sizeof($values)==1)
      {
          $set[] = array_shift($values);
          return makeSpecial($set);
      }

      foreach($values as $key=>$value)
      {
          $tmpValues = $values;
          unset($tmpValues[$key]);
          foreach($words as $word)
          {
              makeValue($tmpValues, array_merge($set, array($value, $word)));
          }
      }
  }

  function makeSpecial($set)
  {
      $size = sizeof($set);

      if($size<=3 || !in_array("/", $set) && !in_array("*", $set))
      {
          return makeResult($set);
      }

      for($len=3; $len<$size-1; $len+=2)
      {
          for($start=0; $start<$size-1; $start+=2)
          {
              if(!($set[$start-1]=="*" || $set[$start-1]=="/" || $set[$start+$len]=="*" || $set[$start+$len]=="/"))
                  continue;
              $subSet = array_slice($set, $start, $len);
              if(!in_array("+", $subSet) && !in_array("-", $subSet))
                  continue;
              $tmpSet = $set;
              array_splice($tmpSet, $start, $len-1);
              $tmpSet[$start] = "(".implode("", $subSet).")";
              makeSpecial($tmpSet);
          }
      }
  }

  function makeResult($set)
  {
      global $result, $list;
      $str = implode("", $set);
      @eval("\$num=$str;");
      if($num==$result && !in_array($str, $list))
      $list[] = $str;
  }
  echo "<pre>";
  ?>

  <!-- 返回 -->
<form action="1.php" method="post">
 回到上一页：
<input type="submit">
</form>
   </body>
 </html>

```
