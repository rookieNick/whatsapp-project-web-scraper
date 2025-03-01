CREATE DATABASE  IF NOT EXISTS `whatsapp_order` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `whatsapp_order`;
-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: localhost    Database: whatsapp_order
-- ------------------------------------------------------
-- Server version	8.0.40

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` varchar(200) NOT NULL,
  `sender` varchar(200) DEFAULT NULL,
  `msgDatetime` datetime DEFAULT NULL,
  `orderDate` date DEFAULT NULL,
  `area` varchar(200) DEFAULT NULL,
  `name` varchar(200) DEFAULT NULL,
  `orderDetails` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES ('ORDER1','Tony (App)','2025-02-28 11:20:00','2025-03-01','FJ','BigCrab Kolomee',';Oil 1 tong'),('ORDER10','Tony (App)','2025-02-27 18:36:00','2025-02-28','PT','Shin Boon Kee',';local belly 2pcs'),('ORDER11','+60 16-433 4649','2025-02-27 19:17:00','2025-02-28','G','lim tomyam',';猪油（粒）1kg\n;涮涮肉 8kg'),('ORDER12','Tony (App)','2025-02-27 20:47:00','2025-02-28','G','3rd Auntie',';Imp Belly Skinless cut 1.5cm 5kg'),('ORDER13','Tony (App)','2025-02-27 20:48:00','2025-02-28','G','Malls Cafe',';Big Bone 1kg\n;Mince 500g'),('ORDER14','+60 17-239 7600','2025-02-27 21:10:00','2025-02-28','G','New Lane char Kueh tiaw',';Fat -4kg'),('ORDER15','+60 17-239 7600','2025-02-27 21:15:00','2025-02-28','G','3066',';Pork slice 15kg\n;Minced 2kg'),('ORDER16','+60 17-239 7600','2025-02-27 21:16:00','2025-02-28','FJ','Genting',';Char siew 5kg*4'),('ORDER17','+60 17-239 7600','2025-02-27 21:18:00','2025-02-28','G','Curry Mee 7 road',';Blood 5kg*4'),('ORDER18','+60 17-239 7600','2025-02-27 21:19:00','2025-02-28','G','Xiao Fong',';Leg 1 nos cut\n;Tau you bak 1.5kg\n;Minced 1kg\n;Intestine 1kg'),('ORDER19','+60 17-239 7600','2025-02-27 21:21:00','2025-02-28','G','Keong penang fast food',';Loin dui 6kg \n;Imp belly 1 ctn \n;Hand cut 5kg'),('ORDER2','Tony (App)','2025-02-28 11:20:00','2025-03-01','G','Between The Coffee House',';Oil 1 tong'),('ORDER20','+60 16-433 4649','2025-02-27 21:50:00','2025-02-28','pt','老顺记',';\n;Imp belly 2ctn'),('ORDER21','Tony (App)','2025-02-27 22:06:00','2025-02-28','BL','Nan Chicken',';Local belly 1pcs'),('ORDER22','Tony (App)','2025-02-27 22:09:00','2025-02-28','G','LTB',';pork belly 7cmx5cmx1cm (thick) 60kg\n;real ribs cut 4cm/1.5inci 36kg\n;Pig stomache 100pcs\n;Loh bak shoulder minced (cutted) 30kg'),('ORDER23','Tony (App)','2025-02-27 22:17:00','2025-02-28','G','Khao Kun PR',';Import Belly 2ctn'),('ORDER24','+60 17-239 7600','2025-02-27 22:32:00','2025-02-28','G','The lightbulb cafe',';Real rib 1 set \n;Local belly 6kg'),('ORDER25','+60 17-239 7600','2025-02-27 22:33:00','2025-02-28','G','Ms Tan',';Pork roll 1kg*6\n;Pork slice 4kg'),('ORDER26','+60 17-239 7600','2025-02-27 22:35:00','2025-02-28','G','Yi bing qing',';Shoulder pack 3 nos \n;Back pork 1 ctn \n;Skin 10kg'),('ORDER27','+60 17-239 7600','2025-02-27 22:36:00','2025-02-28','PT','Heap Seng wan tan Mee',';Minced 2kg*4'),('ORDER28','+60 17-239 7600','2025-02-27 22:37:00','2025-02-28','FJ','YYW',';Big bone 10kg\n;Minced 3kg'),('ORDER29','+60 17-239 7600','2025-02-27 22:40:00','2025-02-28','FJ','Liuzhou rice noodles',';Big bone 10kg\n;Liver 1 nos \n;Intestine 500g\n;Heart 2nos'),('ORDER3','Tony (App)','2025-02-28 13:14:00','2025-03-01','G','Malls Cafe',';big bone 1kg x 2\n;mince 500g x 2\n;shabu belly 2kg x 1'),('ORDER30','+60 17-239 7600','2025-02-27 22:41:00','2025-02-28','FJ','Nasi Goreng',';Pork slice 8kg'),('ORDER31','+60 16-433 4649','2025-02-27 22:44:00','2025-02-28','FJ','猪先生',';Leg 2ctn'),('ORDER32','+60 17-239 7600','2025-02-27 22:44:00','2025-02-28','BL','Thai Shop Food Bayana',';Minced 8kg\n;Big bone 3kg'),('ORDER33','+60 17-239 7600','2025-02-27 22:52:00','2025-02-28','FJ','Genki Canteen',';Rib 2 kg\n;Loin 1 kg*2'),('ORDER34','+60 17-239 7600','2025-02-28 00:13:00','2025-02-28','FJ','Eight Heng curry Mee',';Blood 6kg'),('ORDER35','+60 17-239 7600','2025-02-28 01:53:00','2025-02-28','FJ','Sim sin kai',';Loin 2kg\n;Shabu belly 500g*4\n;Beef slice 500g*1'),('ORDER36','Tony (App)','2025-02-28 06:11:00','2025-02-28','G','Siampoh',';Pork Bone - 5kg\n;Pork Liver - 1pcs\n;Pig Blood Cube - 500g\n;Pig Blood Bottle - 3bottle'),('ORDER37','Tony (App)','2025-02-28 06:12:00','2025-02-28','FJ','HAINANESE',';Loin cut 0.8m 2kg'),('ORDER38','Tony (App)','2025-02-28 06:13:00','2025-02-28','BL','Khao Kun BL',';Belly 50kg'),('ORDER39','Tony (App)','2025-02-28 06:58:00','2025-02-28','FJ','QiFanGe',';local hand 1nos no cut'),('ORDER4','+60 17-239 7600','2025-02-28 13:38:00','2025-03-01','BW','Zai sai bei',';Fat 20kg'),('ORDER40','+60 16-433 4649','2025-02-28 07:03:00','2025-02-28','BL','shank shank','imp Belly 2nos'),('ORDER41','+60 16-433 4649','2025-02-28 07:05:00','2025-02-28','Fj','金圆',';排骨王6kg。三层要皮6kg。。猪手5开2.一只2kg的手，'),('ORDER42','+60 16-433 4649','2025-02-28 07:42:00','2025-02-28','Fj','1688 bkt',';排骨bullet 12kg\n;Leg cut half 2nos'),('ORDER43','+60 17-239 7600','2025-02-28 07:53:00','2025-02-28','G','SHP restaurant',';Imp belly 10kg'),('ORDER44','Tony (App)','2025-02-28 07:58:00','2025-02-28','G','66 Chinese Teppanyaki',';Import Belly skin less 1pcs cut 4\n;mince 500g\n;large intestine 3kg'),('ORDER45','+60 12-564 7600','2025-02-28 07:59:00','2025-02-28','G','Katering makanan',';肉骨10kg (more meat pls)'),('ORDER46','+60 12-564 7600','2025-02-28 08:01:00','2025-02-28','FJ','will western',';4kg fresh loin\n;Pork belly 2kg remove skin less oil'),('ORDER47','+60 12-564 7600','2025-02-28 08:05:00','2025-03-01','BW','Linsin infinity',';Shabu belly 2kg rm68/box 10box'),('ORDER48','+60 12-564 7600','2025-02-28 08:05:00','2025-02-28','G','Linsin infinity',';Shabu belly 2kg rm68/box\n;6box'),('ORDER49','+60 12-564 7600','2025-02-28 08:06:00','2025-02-28','BL','Linsin infinity',';Shabu belly 2kg rm68/box\n;10box'),('ORDER5','+60 17-239 7600','2025-02-28 13:39:00','2025-03-01','G','New Lane char Kueh tiaw',';Fat 8kg'),('ORDER50','+60 12-564 7600','2025-02-28 08:12:00','2025-02-28','PT','Gens (inside mall)',';Chat siew 1 kg rm48/kg\n;烧肉 2 kg rm80/kg\n;*collect cash'),('ORDER51','+60 17-239 7600','2025-02-28 08:33:00','2025-02-28','G','Yu Kee Kopitiam Pan mee',';Minced 18kg'),('ORDER6','+60 17-239 7600','2025-02-28 13:40:00','2025-03-01','FJ','Genting',';Char siew 5kg*4'),('ORDER7','+60 16-433 4649','2025-02-28 16:23:00','2025-03-01','FJ','Q cafe',';明天的订单\n;柔骨 3kg. 2inch@2inch\n;三層 5kg. 1.5inch\n;排骨 2kg 2inch@2inch\n;碎肉 2kg \n; 全部肉请帮我冲水一下，才收冰廂。\n;谢谢你！\n;Q café'),('ORDER8','+60 17-239 7600','2025-02-28 17:01:00','2025-03-01','FJ','Big bowl',';S.belly 2kg*10'),('ORDER9','+60 16-433 4649','2025-02-28 17:06:00','2025-03-01','G','yuan xin',';Fat 3kg Rm20');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-02-28 20:00:20
