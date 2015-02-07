-- phpMyAdmin SQL Dump
-- version 4.1.12
-- http://www.phpmyadmin.net
--
-- Host: 127.0.0.1
-- Erstellungszeit: 06. Feb 2015 um 20:13
-- Server Version: 5.6.16
-- PHP-Version: 5.5.11

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Datenbank: `pokengine`
--

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `activity`
--

CREATE TABLE IF NOT EXISTS `activity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `time` datetime NOT NULL,
  `plays` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=44 ;

--
-- Daten für Tabelle `activity`
--

INSERT INTO `activity` (`id`, `time`, `plays`) VALUES
(1, '0000-00-00 00:00:00', 1),
(2, '0000-00-00 00:00:00', 1),
(3, '0000-00-00 00:00:00', 1),
(4, '0000-00-00 00:00:00', 1),
(5, '0000-00-00 00:00:00', 1),
(6, '0000-00-00 00:00:00', 1),
(7, '0000-00-00 00:00:00', 1),
(8, '0000-00-00 00:00:00', 1),
(9, '0000-00-00 00:00:00', 1),
(10, '0000-00-00 00:00:00', 1),
(11, '0000-00-00 00:00:00', 1),
(12, '0000-00-00 00:00:00', 1),
(13, '0000-00-00 00:00:00', 1),
(14, '0000-00-00 00:00:00', 1),
(15, '0000-00-00 00:00:00', 1),
(16, '0000-00-00 00:00:00', 1),
(17, '0000-00-00 00:00:00', 1),
(18, '0000-00-00 00:00:00', 1),
(19, '0000-00-00 00:00:00', 1),
(20, '0000-00-00 00:00:00', 1),
(21, '0000-00-00 00:00:00', 1),
(22, '0000-00-00 00:00:00', 1),
(23, '0000-00-00 00:00:00', 1),
(24, '0000-00-00 00:00:00', 1),
(25, '0000-00-00 00:00:00', 1),
(26, '0000-00-00 00:00:00', 1),
(27, '0000-00-00 00:00:00', 1),
(28, '0000-00-00 00:00:00', 1),
(29, '0000-00-00 00:00:00', 1),
(30, '0000-00-00 00:00:00', 1),
(31, '0000-00-00 00:00:00', 1),
(32, '0000-00-00 00:00:00', 1),
(33, '0000-00-00 00:00:00', 1),
(34, '0000-00-00 00:00:00', 1),
(35, '0000-00-00 00:00:00', 1),
(36, '0000-00-00 00:00:00', 1),
(37, '0000-00-00 00:00:00', 1),
(38, '0000-00-00 00:00:00', 1),
(39, '0000-00-00 00:00:00', 1),
(40, '0000-00-00 00:00:00', 1),
(41, '0000-00-00 00:00:00', 1),
(42, '0000-00-00 00:00:00', 1),
(43, '0000-00-00 00:00:00', 1);

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `groups`
--

CREATE TABLE IF NOT EXISTS `groups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(20) DEFAULT NULL,
  `permissions` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `maps`
--

CREATE TABLE IF NOT EXISTS `maps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(30) NOT NULL,
  `side_n` varchar(60) NOT NULL,
  `side_s` varchar(60) NOT NULL,
  `side_w` varchar(60) NOT NULL,
  `side_e` varchar(60) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=2 ;

--
-- Daten für Tabelle `maps`
--

INSERT INTO `maps` (`id`, `name`, `side_n`, `side_s`, `side_w`, `side_e`) VALUES
(1, 'Anchore Town', '1', '1', '1', '1');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `players`
--

CREATE TABLE IF NOT EXISTS `players` (
  `id` int(15) NOT NULL AUTO_INCREMENT,
  `username` varchar(20) NOT NULL,
  `password` varchar(80) NOT NULL,
  `name` varchar(32) NOT NULL,
  `joined` datetime NOT NULL,
  `group` int(11) NOT NULL,
  `rank` int(1) NOT NULL,
  `online` int(11) NOT NULL,
  `user_color` varchar(6) NOT NULL,
  `beta` int(1) NOT NULL DEFAULT '1',
  `x` int(5) NOT NULL,
  `y` int(5) NOT NULL,
  `map` int(15) NOT NULL,
  `facing` int(1) NOT NULL DEFAULT '4',
  `skin` varchar(10) NOT NULL,
  `money` int(7) NOT NULL DEFAULT '3000',
  `last_played` varchar(20) NOT NULL,
  `skin_color` int(2) NOT NULL,
  `play_time` int(20) NOT NULL,
  `health` int(1) NOT NULL DEFAULT '100',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=9 ;

--
-- Daten für Tabelle `players`
--

INSERT INTO `players` (`id`, `username`, `password`, `name`, `joined`, `group`, `rank`, `online`, `user_color`, `beta`, `x`, `y`, `map`, `facing`, `skin`, `money`, `last_played`, `skin_color`, `play_time`, `health`) VALUES
(5, 'develix', '098f6bcd4621d373cade4e832627b4f6', 'FELIX', '0000-00-00 00:00:00', 0, 0, 0, '0', 1, 224, 480, 116, 1, '0', 1000, '1423249946.683', 0, 19800, 100);

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `players_pokemon`
--

CREATE TABLE IF NOT EXISTS `players_pokemon` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(32) NOT NULL,
  `user` int(11) NOT NULL,
  `box` int(11) NOT NULL DEFAULT '0',
  `dex` int(11) NOT NULL,
  `pid` int(11) NOT NULL,
  `forme` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=5 ;

--
-- Daten für Tabelle `players_pokemon`
--

INSERT INTO `players_pokemon` (`id`, `name`, `user`, `box`, `dex`, `pid`, `forme`) VALUES
(1, 'Bulbasaur', 6, -1, 1, 1, 1),
(2, 'Bulbasaur', 7, -1, 1, 1, 1),
(3, 'Bulbasaur', 5, -1, 1, 1, 1),
(4, 'Bulbasaur', 5, -1, 1, 1, 1);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
